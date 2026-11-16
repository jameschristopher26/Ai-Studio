window.addEventListener('DOMContentLoaded', () => {
    // --- 1. Three.js 3D Teardrop Flacon Setup ---
    const container = document.getElementById('canvas-container');
    if (!container) return;

    const width = container.clientWidth || window.innerWidth * 0.8;
    const height = container.clientHeight || 600;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);

    // Apple-style studio lighting setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.0);
    keyLight.position.set(10, 20, 10);
    scene.add(keyLight);

    const rimLight = new THREE.PointLight(0xD4AF37, 3, 20);
    rimLight.position.set(-8, -5, 4);
    scene.add(rimLight);

    // --- Build Teardrop Flacon ---
    const bottleGroup = new THREE.Group();
    scene.add(bottleGroup);

    const points = [];
    for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const x = Math.sin(t * Math.PI) * 1.1 + (1 - t) * 0.15;
        const y = (t - 0.5) * 3.5;
        points.push(new THREE.Vector2(x, y));
    }

    // Glass Body
    const bodyGeo = new THREE.LatheGeometry(points, 64);
    const bodyMat = new THREE.MeshPhysicalMaterial({
        color: 0x0c0c0e,
        roughness: 0.08,
        metalness: 0.1,
        transmission: 0.94,
        thickness: 1.5,
        ior: 1.52,
        transparent: true,
        opacity: 0.96,
        side: THREE.DoubleSide
    });
    const glassBody = new THREE.Mesh(bodyGeo, bodyMat);
    bottleGroup.add(glassBody);

    // Golden Liquid Inside
    const liquidPoints = [];
    for (let i = 0; i <= 25; i++) {
        const t = i / 25;
        const x = (Math.sin(t * Math.PI) * 1.0 + (1 - t) * 0.1) * 0.88;
        const y = (t - 0.5) * 3.3;
        liquidPoints.push(new THREE.Vector2(x, y));
    }
    const liquidGeo = new THREE.LatheGeometry(liquidPoints, 64);
    const liquidMat = new THREE.MeshStandardMaterial({
        color: 0xD4AF37,
        roughness: 0.2,
        metalness: 0.5,
        transparent: true,
        opacity: 0.85
    });
    const liquid = new THREE.Mesh(liquidGeo, liquidMat);
    liquid.position.y = -0.1;
    bottleGroup.add(liquid);

    // Gold Neck & Cap
    const goldMat = new THREE.MeshStandardMaterial({ color: 0xD4AF37, metalness: 0.95, roughness: 0.15 });
    
    const neckGeo = new THREE.CylinderGeometry(0.35, 0.45, 0.5, 32);
    const neck = new THREE.Mesh(neckGeo, goldMat);
    neck.position.y = 1.9;
    bottleGroup.add(neck);

    const capGeo = new THREE.CylinderGeometry(0.42, 0.42, 0.9, 32);
    const cap = new THREE.Mesh(capGeo, goldMat);
    cap.position.y = 2.5;
    bottleGroup.add(cap);

    // --- Drag Rotation Controls ---
    let isDragging = false;
    let prevMousePos = { x: 0, y: 0 };

    container.addEventListener('mousedown', (e) => {
        isDragging = true;
        prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mousemove', (e) => {
        if (!isDragging) return;
        const deltaX = e.clientX - prevMousePos.x;
        const deltaY = e.clientY - prevMousePos.y;

        bottleGroup.rotation.y += deltaX * 0.008;
        bottleGroup.rotation.x += deltaY * 0.008;
        bottleGroup.rotation.x = Math.max(-0.5, Math.min(0.5, bottleGroup.rotation.x));

        prevMousePos = { x: e.clientX, y: e.clientY };
    });

    window.addEventListener('mouseup', () => { isDragging = false; });

    // Touch support
    container.addEventListener('touchstart', (e) => {
        isDragging = true;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    window.addEventListener('touchmove', (e) => {
        if (!isDragging) return;
        const deltaX = e.touches[0].clientX - prevMousePos.x;
        bottleGroup.rotation.y += deltaX * 0.008;
        prevMousePos = { x: e.touches[0].clientX, y: e.touches[0].clientY };
    });
    window.addEventListener('touchend', () => { isDragging = false; });

    // Animation Loop
    const clock = new THREE.Clock();
    function animate() {
        requestAnimationFrame(animate);
        const t = clock.getElapsedTime();

        if (!isDragging) {
            bottleGroup.rotation.y += 0.004;
            bottleGroup.position.y = Math.sin(t * 1.5) * 0.06;
        }

        renderer.render(scene, camera);
    }
    animate();

    // Resize Handler
    window.addEventListener('resize', () => {
        const w = container.clientWidth || window.innerWidth * 0.8;
        const h = container.clientHeight || 600;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    });
});

// --- 2. Interactive Purchase Configurator Logic ---
function selectSize(size, price) {
    document.getElementById('summary-size').innerText = size;
    document.getElementById('summary-price').innerText = `$${price}.00`;

    const btn50 = document.getElementById('size-50ml');
    const btn100 = document.getElementById('size-100ml');

    if (size === '50ml') {
        btn50.className = "py-3 text-xs tracking-widest uppercase border border-gold bg-gold/10 rounded-xl text-gold transition";
        btn100.className = "py-3 text-xs tracking-widest uppercase border border-white/20 rounded-xl text-white/70 hover:border-gold transition";
    } else {
        btn100.className = "py-3 text-xs tracking-widest uppercase border border-gold bg-gold/10 rounded-xl text-gold transition";
        btn50.className = "py-3 text-xs tracking-widest uppercase border border-white/20 rounded-xl text-white/70 hover:border-gold transition";
    }
}

function addToBag() {
    const btn = document.querySelector('button[onclick="addToBag()"]');
    const original = btn.innerHTML;
    btn.innerHTML = "✓ Added to Bag Successfully";
    btn.classList.add("bg-emerald-500", "text-white");
    setTimeout(() => {
        btn.innerHTML = original;
        btn.classList.remove("bg-emerald-500", "text-white");
    }, 2000);
}