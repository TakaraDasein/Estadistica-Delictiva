import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { type Depto, corto, delitos, nombreDepto, useData } from "@/lib/data";
import { SEQ, token } from "@/lib/color";
import { aniosDisponibles, type GeoFC, ISLA, proyectar, valoresDepto } from "@/lib/geo";
import { dec } from "@/lib/format";
import { Cargando } from "./Tip";

const W = 400, H = 500;

/** Mapa 3D extruido (three.js): altura y color = tasa por 100 mil.
 *  La altura duplica el color (redundante a propósito) para leer el relieve del riesgo. */
export default function Mapa3D({ inicial = "homicidios" }: { inicial?: string }) {
  const geo = useData<GeoFC>("departamentos.geo");
  const depto = useData<Depto>("depto");
  const host = useRef<HTMLDivElement>(null);
  const [slug, setSlug] = useState(inicial);
  const [hover, setHover] = useState<string | null>(null);
  const [tema, setTema] = useState(0);
  const anio = useMemo(() => (depto ? aniosDisponibles(depto, slug).at(-1) ?? 2023 : 2023), [depto, slug]);

  useEffect(() => {
    const f = () => setTema((t) => t + 1);
    window.addEventListener("themechange", f);
    const mq = matchMedia("(prefers-color-scheme: dark)");
    mq.addEventListener("change", f);
    return () => { window.removeEventListener("themechange", f); mq.removeEventListener("change", f); };
  }, []);

  useEffect(() => {
    if (!geo || !depto || !host.current) return;
    const el = host.current;
    const ancho = el.clientWidth, alto = Math.min(520, Math.max(360, ancho * 0.9));
    const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    renderer.setSize(ancho, alto);
    el.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, ancho / alto, 1, 5000);
    camera.position.set(0, -520, 520);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.autoRotate = !reduce;
    controls.autoRotateSpeed = 0.6;
    controls.maxPolarAngle = Math.PI / 2.1;

    scene.add(new THREE.AmbientLight(0xffffff, 1.6));
    const sol = new THREE.DirectionalLight(0xffffff, 2.2);
    sol.position.set(-200, -300, 600);
    scene.add(sol);

    const { path, continental } = proyectar(geo, W, H);
    const vals = valoresDepto(depto, slug, anio);
    const tasas = Object.values(vals).map((v) => v.tasa).sort((a, b) => a - b);
    const max = tasas.at(-1) || 1;
    const rampa = SEQ.map(token);
    const colorDe = (t: number) => rampa[Math.min(rampa.length - 1, Math.floor((tasas.findIndex((x) => x >= t) / tasas.length) * rampa.length))];

    const mallas: THREE.Mesh[] = [];
    const ctxPath = (f: (typeof continental.features)[number]) => {
      // d3-geo dibuja sobre un "contexto" con la API de canvas → la traducimos a THREE.Shape.
      const shapes: THREE.Shape[] = [];
      let cur: THREE.Shape | null = null;
      const ctx = {
        moveTo: (x: number, y: number) => { cur = new THREE.Shape(); cur.moveTo(x - W / 2, H / 2 - y); shapes.push(cur); },
        lineTo: (x: number, y: number) => cur?.lineTo(x - W / 2, H / 2 - y),
        closePath: () => cur?.closePath(),
        arc: () => {},
      };
      path.context(ctx as never)(f as never);
      path.context(null);
      return shapes;
    };

    for (const f of continental.features) {
      const cod = f.properties.cod_dpto;
      const t = vals[cod]?.tasa ?? 0;
      const geom = new THREE.ExtrudeGeometry(ctxPath(f), { depth: 4 + (t / max) * 110, bevelEnabled: false });
      const mat = new THREE.MeshStandardMaterial({ color: new THREE.Color(colorDe(t)), roughness: 0.75, metalness: 0.05 });
      const mesh = new THREE.Mesh(geom, mat);
      mesh.userData.cod = cod;
      scene.add(mesh);
      mallas.push(mesh);
      const borde = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 30), new THREE.LineBasicMaterial({ color: new THREE.Color(token("--surface")), transparent: true, opacity: 0.6 }));
      scene.add(borde);
    }

    const ray = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let resaltado: THREE.Mesh | null = null;
    const onMove = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect();
      mouse.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(mouse, camera);
      const hit = ray.intersectObjects(mallas)[0]?.object as THREE.Mesh | undefined;
      if (resaltado && resaltado !== hit) (resaltado.material as THREE.MeshStandardMaterial).emissive.setHex(0);
      if (hit) { (hit.material as THREE.MeshStandardMaterial).emissive.setHex(0x333333); controls.autoRotate = false; }
      resaltado = hit ?? null;
      setHover(hit?.userData.cod ?? null);
    };
    renderer.domElement.addEventListener("pointermove", onMove);

    let raf = 0;
    const loop = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(loop); };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      renderer.domElement.removeEventListener("pointermove", onMove);
      controls.dispose();
      scene.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.LineSegments) { o.geometry.dispose(); (o.material as THREE.Material).dispose(); }
      });
      renderer.dispose();
      el.removeChild(renderer.domElement);
    };
  }, [geo, depto, slug, anio, tema]);

  if (!geo || !depto) return <Cargando />;
  const vals = valoresDepto(depto, slug, anio);
  return (
    <div>
      <div className="controls">
        <select aria-label="Delito" value={slug} onChange={(e) => setSlug(e.target.value)}>
          {delitos.map((c) => <option key={c.categoria_slug} value={c.categoria_slug}>{corto(c.categoria_slug)}</option>)}
        </select>
        <span className="badge">{anio} · altura = tasa por 100 mil</span>
        <span className="note" style={{ margin: 0 }}>
          {hover ? `${nombreDepto(hover)}: ${dec(vals[hover]?.tasa)} por 100 mil` : "Arrastra para girar · rueda para acercar"}
        </span>
      </div>
      <div ref={host} style={{ width: "100%", touchAction: "none", borderRadius: 8, background: "var(--surface-2)" }}
        aria-label={`Mapa 3D de ${corto(slug)}; la tabla del mapa 2D contiene los mismos valores`} role="img" />
      <p className="note">San Andrés ({ISLA}) se omite en 3D por escala; ver mapa 2D y ranking para todos los valores.</p>
    </div>
  );
}
