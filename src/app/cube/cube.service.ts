import * as THREE from 'three';
import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';

@Injectable({ providedIn: 'root' })
export class EngineService implements OnDestroy {
    private canvas: HTMLCanvasElement;
    private renderer: THREE.WebGLRenderer;
    private camera: THREE.PerspectiveCamera;
    private scene: THREE.Scene;
    private light: THREE.AmbientLight;
    private controls: any;

    private frameId: number = null;


    private pieces: THREE.Object3D[] = [];

    private moveQueue: { axis: string, direction: number }[] = []
    private pivot = new THREE.Object3D();
    private activeGroup: THREE.Object3D[] = [];
    private isMoving = false;
    private moveAxis: string;
    private moveRotationSpeed = 0.05;
    private moveDirection: number;

    public constructor(private ngZone: NgZone) { }

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
        this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 50);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(new THREE.Vector3(0, 0, 0))
        this.scene.add(this.camera);

        // soft white light
        this.light = new THREE.AmbientLight(0xFFFFFF, Math.PI);
        this.light.position.set(0, 0, 0);
        this.scene.add(this.light);

        const axesHelper = new THREE.AxesHelper(20);
        this.scene.add(axesHelper);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);


        this.createCube();
        this.moveQueue.push({ axis: "R", direction: 1 })
        this.startMove()
        this.moveQueue.push({ axis: "R", direction: 1 })
        setTimeout(() => this.startMove(), 2000)
    }

    public createCube(): void {
        let cubeSize = 3;
        let sideDepth = 0.1;
        let padding = 0.2;
        let spacing = 0.5;
        let increment = cubeSize + spacing;
        let positionOffset = 1; // for 3x3

        for (let x = 0; x < 3; ++x) {
            for (let y = 0; y < 3; ++y) {
                for (let z = 0; z < 3; ++z) {
                    let piece = new THREE.Group();

                    let colors = [0xFF0000, 0xFFB65C, 0xFFFFFF, 0xFDE410, 0x00FF00, 0x0000FF];
                    let faceMaterials = colors.map(function(c) {
                        return new THREE.MeshLambertMaterial({ color: new THREE.Color(c), flatShading: true, transparent: true, opacity: 0.9 });
                    });
                    let boxGeometry = new THREE.BoxGeometry(cubeSize, cubeSize, cubeSize);
                    let boxMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(0xffffff), transparent: true, opacity: 0.5 });
                    let box = new THREE.Mesh(boxGeometry, faceMaterials);
                    piece.add(box);

                    // let sideGeometry = new THREE.BoxGeometry(cubeSize - padding, sideDepth, cubeSize - padding);
                    // let sideMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(0xFF00FF) });
                    // let side = new THREE.Mesh(sideGeometry, sideMaterial);
                    // side.position.set(0, 0, cubeSize / 2 + sideDepth / 2);
                    // side.rotation.set(Math.PI / 2, 0, 0)
                    // piece.add(side);
                    //
                    // new FontLoader().load("assets/font.json", font => {
                    //     let fontSize = 1.5;
                    //     let fontDepth = 0.1;
                    //     let textGeometry = new TextGeometry("A", {
                    //         font: font,
                    //         size: fontSize,
                    //         depth: fontDepth
                    //     });
                    //     textGeometry.center()
                    //     console.log("FONT LOADED")
                    //     let text = new THREE.Mesh(textGeometry, new THREE.MeshBasicMaterial({ color: new THREE.Color(0xFF00FF) }));
                    //     text.position.set(0, 0, cubeSize / 2 + fontDepth / 2 + sideDepth)
                    //     piece.add(text);
                    //
                    // }, () => console.log("FONT LOAD FAILED"))

                    (piece as any)["rubikPosition"] = new THREE.Vector3(x - positionOffset, y - positionOffset, z - positionOffset)
                    piece.position.set((x - positionOffset) * (cubeSize + padding), (y - positionOffset) * (cubeSize + padding), (z - positionOffset) * (cubeSize + padding))
                    this.pieces.push(piece)
                    this.scene.add(piece)
                }
            }
        }
    }

    private nearlyEqual(a: number, b: number, d = 0.001) {
        return Math.abs(a - b) <= d;
    }

    public setActiveGroup(moveAxis: string): void {
        this.activeGroup = [];
        switch (moveAxis) {
            case "L":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].x, -1)) { this.activeGroup.push(p) } })
                break;
            case "R":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].x, 1)) { this.activeGroup.push(p) } })
                break;
            case "U":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].y, 1)) { this.activeGroup.push(p) } })
                break;
            case "D":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].y, -1)) { this.activeGroup.push(p) } })
                break;
            case "F":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].z, 1)) { this.activeGroup.push(p) } })
                break;
            case "B":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].z, -1)) { this.activeGroup.push(p) } })
                break;
            default:
                console.log("Illegal move axis")
                break;
        }

    }

    public startMove(): void {
        let move = this.moveQueue.pop();
        if (move) {
            if (!this.isMoving) {
                console.log(move)
                this.isMoving = true;
                this.moveAxis = move.axis;
                this.moveDirection = move.direction;

                this.setActiveGroup(this.moveAxis);
                console.log(this.pieces)
                this.pivot.rotation.set(0, 0, 0);
                this.pivot.updateMatrixWorld();
                this.scene.add(this.pivot);

                for (let piece of this.activeGroup) {
                    this.scene.remove(piece)
                    this.pivot.add(piece);
                }
            }
        }
    }

    public getAxisByString(s: string): string {
        switch (s) {
            case "F":
            case "B":
                return "z";
            case "U":
            case "D":
                return "y";
            case "L":
            case "R":
                return "x";
            default:
                console.error("Illegal move")
                return "x";
        }
    }
    public doMove(): void {
        let xyz = this.getAxisByString(this.moveAxis)
        if ((this.pivot.rotation as any)[xyz] >= Math.PI / 2) {
            (this.pivot.rotation as any)[xyz] = Math.PI / 2;
            this.completeMove();
        } else if ((this.pivot.rotation as any)[xyz] <= Math.PI / -2) {
            (this.pivot.rotation as any)[xyz] = Math.PI / -2;
            this.completeMove();
        } else {
            (this.pivot.rotation as any)[xyz] += this.moveDirection * this.moveRotationSpeed;
        }
    }

    public completeMove(): void {
        this.isMoving = false;
        this.moveAxis, this.moveDirection = undefined;

        this.pivot.updateMatrixWorld(true);
        this.scene.remove(this.pivot);
        this.pivot.clear();
        for (let piece of this.activeGroup) {
            piece.updateMatrixWorld();
            piece.applyMatrix4(this.pivot.matrixWorld)
            this.pivot.remove(piece);
            this.scene.add(piece);
        }
    }

    public render(): void {
        this.controls.update();
        // Logic
        if (this.isMoving) {
            this.doMove();
        }
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(() => {
            this.render();
        });
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

    public resize(): void {
        const width = window.innerWidth;
        const height = window.innerHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }
}
