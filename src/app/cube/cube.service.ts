import * as THREE from 'three';
import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private light: THREE.AmbientLight;

    private cube: THREE.Mesh;

    private frameId: number = null;

    public constructor(private ngZone: NgZone) {
    }

    public ngOnDestroy(): void {
        if (this.frameId != null) {
            cancelAnimationFrame(this.frameId);
        }
        if (this.renderer != null) {
            this.renderer.dispose();
        }
    }

    public createScene(canvas: ElementRef<HTMLCanvasElement>): void {
        // The first step is to get the reference of the canvas element from our HTML document
        this.canvas = canvas.nativeElement;

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            alpha: true,    // transparent background
            antialias: true // smooth edges
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        // create the scene
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 50);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))
        this.scene.add(this.camera);

        // soft white light
        this.light = new THREE.AmbientLight(0x404040);
        this.light.position.set(20, 20, 20);
        this.scene.add(this.light);

        const axesHelper = new THREE.AxesHelper(5);
        this.scene.add(axesHelper);

        let cubeSize = 3;
        let spacing = 0.5;
        let increment = cubeSize + spacing;

        for (let x = 0; x < 3; x++) {
            for (let y = 0; y < 3; y++) {
                for (let z = 0; z < 3; z++) {
                    var cubeGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                    var cube = new THREE.Mesh(cubeGeometry, new THREE.MeshMatcapMaterial({ color: new THREE.Color(0xff00ff), transparent: true, opacity: 0.5 }));
                    cube.position.set((x - 1) * increment, (y - 1) * increment, (z - 1) * increment);
                    this.scene.add(cube);
                }
            }
        }

    }

    public animate(): void {
        // We have to run this outside angular zones,
        // because it could trigger heavy changeDetection cycles.
        this.ngZone.runOutsideAngular(() => {
            if (document.readyState !== 'loading') {
                this.render();
            } else {
                window.addEventListener('DOMContentLoaded', () => {
                    this.render();
                });
            }

            window.addEventListener('resize', () => {
                this.resize();
            });
        });
    }

    public render(): void {
        this.frameId = requestAnimationFrame(() => {
            this.render();
        });

        this.renderer.render(this.scene, this.camera);
    }

    public resize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }
}
