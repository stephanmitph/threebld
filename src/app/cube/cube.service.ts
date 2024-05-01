import * as THREE from 'three';
import { ElementRef, Injectable, NgZone, OnDestroy } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import { RoundedPlaneGeometry } from './RoundedPlaneGeometry.js';
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

    // Cube options
    private cubeSize = 3;
    private pieceSize = 3;
    private piecePadding = 0.1;
    private pieceSpacing = 0.5;
    private planePadding = 0.5;
    private planeDepth = 0.1;
    private piecePositionOffset = 1; // for 3x3

    private pieces: THREE.Object3D[] = [];

    private moveQueue: { axis: string, direction: number }[] = []
    private pivot = new THREE.Object3D()
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
        this.camera = new THREE.PerspectiveCamera(30, window.innerWidth / window.innerHeight, 0.1, 10000);
        this.camera.position.set(40, 40, 40);
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
        setTimeout(() => { this.moveQueue.push(this.tokenToMove("R")); this.startMove(); }, 0)
        setTimeout(() => { this.moveQueue.push(this.tokenToMove("U")); this.startMove(); }, 1000)
        setTimeout(() => { this.moveQueue.push(this.tokenToMove("R'")); this.startMove(); }, 2000)
        setTimeout(() => { this.moveQueue.push(this.tokenToMove("U'")); this.startMove(); }, 3000)
    }
    j
    private tokenToMove(token: string) {
        return { axis: token.substr(0, 1), direction: token.slice(-1) == "'" ? 1 : -1 }
    }

    private isCornerPiece(cubeSize: number, x: number, y: number, z: number): boolean {
        let c = 0;
        if (x == 0 || x == cubeSize - 1)
            c++
        if (y == 0 || y == cubeSize - 1)
            c++
        if (z == 0 || z == cubeSize - 1)
            c++
        return c >= 3;
    }


    private isMiddlePiece(cubeSize: number, x: number, y: number, z: number): boolean {
        let c = 0;
        if (x == 1)
            c++
        if (y == 1)
            c++
        if (z == 1)
            c++
        return c == 2;
    }

    private isEdgePiece(cubeSize: number, x: number, y: number, z: number): boolean {
        if (x == 1 && y == 1 && z == 1)
            return false

        return !this.isCornerPiece(cubeSize, x, y, z);
    }

    public createCube(): void {
        for (let x = 0; x < 3; ++x) {
            for (let y = 0; y < 3; ++y) {
                for (let z = 0; z < 3; ++z) {
                    if (!this.isEdgePiece(this.cubeSize, x, y, z) && !this.isCornerPiece(this.cubeSize, x, y, z))
                        continue;

                    let piece = new THREE.Group();

                    let boxGeometry = new RoundedBoxGeometry(this.pieceSize, this.pieceSize, this.pieceSize, 3, 0.2);
                    let boxMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(0x333333), transparent: false, opacity: 0.6 });
                    let box = new THREE.Mesh(boxGeometry, boxMaterial);
                    piece.add(box);

                    let planeGeometry = new RoundedPlaneGeometry(this.pieceSize - this.piecePadding - this.planePadding, 0.15, this.planeDepth);
                    let distance = this.pieceSize / 2 + this.planeDepth / 2;
                    let planePositions = [];

                    if (x == 0) planePositions.push(0);
                    if (x == this.cubeSize - 1) planePositions.push(1);
                    if (y == 0) planePositions.push(2);
                    if (y == this.cubeSize - 1) planePositions.push(3);
                    if (z == 0) planePositions.push(4);
                    if (z == this.cubeSize - 1) planePositions.push(5);

                    const color = [0xff8c0a, 0xef3923, 0xffef48, 0xfff7ff, 0x41aac8, 0x82ca38]
                    for (let planePosition of planePositions) {
                        let planeMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(color[planePosition]) });
                        let plane = new THREE.Mesh(planeGeometry, planeMaterial);

                        plane.position.set(
                            distance * [-1, 1, 0, 0, 0, 0][planePosition],
                            distance * [0, 0, -1, 1, 0, 0][planePosition],
                            distance * [0, 0, 0, 0, -1, 1][planePosition],
                        );

                        plane.rotation.set(
                            Math.PI / 2 * [0, 0, 1, - 1, 0, 0][planePosition],
                            Math.PI / 2 * [- 1, 1, 0, 0, 2, 0][planePosition],
                            0
                        );
                        piece.add(plane);
                    }

                    piece.position.set((x - this.piecePositionOffset) * (this.pieceSize + this.piecePadding), (y - this.piecePositionOffset) * (this.pieceSize + this.piecePadding), (z - this.piecePositionOffset) * (this.pieceSize + this.piecePadding));
                    (piece as any)["rubikPosition"] = piece.position.clone();
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
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].x, -1 * (this.pieceSize + this.piecePadding))) { this.activeGroup.push(p) } })
                break;
            case "R":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].x, 1 * (this.pieceSize + this.piecePadding))) { this.activeGroup.push(p) } })
                break;
            case "U":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].y, 1 * (this.pieceSize + this.piecePadding))) { this.activeGroup.push(p) } })
                break;
            case "D":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].y, -1 * (this.pieceSize + this.piecePadding))) { this.activeGroup.push(p) } })
                break;
            case "F":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].z, 1 * (this.pieceSize + this.piecePadding))) { this.activeGroup.push(p) } })
                break;
            case "B":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].z, -1 * (this.pieceSize + this.piecePadding))) { this.activeGroup.push(p) } })
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
            piece.applyMatrix4(this.pivot.matrixWorld);
            (piece as any)["rubikPosition"] = piece.position.clone();
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
