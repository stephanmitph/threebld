import * as THREE from 'three';
import { ElementRef, Injectable, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import { RoundedPlaneGeometry } from './RoundedPlaneGeometry.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import * as TWEEN from '@tweenjs/tween.js';
import { Subject } from 'rxjs';

const MoveType = { U: "y", D: "y", R: "x", L: "x", F: "z", B: "z", M: "x", E: "y", S: "z", x: "x", y: "y", z: "z" }

class Move { moveType: string; direction: 1 | -1; wide: boolean; double: boolean } // ------------------------------------------------------------------------------------------------------------------------------------------------------

class Algorithm {
    name: string | null;
    parts: { name: string, algString: string }[];

    constructor() {
        this.parts = []
    }
}

@Injectable({ providedIn: 'root' })
export class CubeService implements OnDestroy {
    // Three.js options
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

    // Cube, move variables and animation
    private pieces: THREE.Object3D[] = [];
    private pivot = new THREE.Object3D()
    private activeGroup: THREE.Object3D[] = [];
    private moveQueue: Move[] = []
    private isMoving = false;
    private currentMove: Move;
    private currentTween: TWEEN.Tween<any>;

    // Options for from outside
    public moveRotationTime = 600;
    public currentAlgorithmString = "";

    private currentAlgorithmSource = new Subject<string>();
    public currentAlgorithmString$ = this.currentAlgorithmSource.asObservable();

    public constructor(private ngZone: NgZone) {
        this.currentAlgorithmString$.subscribe(alg => {
            console.log("NEW ALG?: " + alg)
            this.currentAlgorithmString = alg;
            this.reset();
            this.startExecution();
        });
    }

    ngOnDestroy(): void {
        if (this.frameId != null) {
            cancelAnimationFrame(this.frameId);
        }
        if (this.renderer != null) {
            this.renderer.dispose();
        }
    }

    public pushNewAlgorithm(alg: string) {
        this.currentAlgorithmSource.next(alg);
    }

    private reset() {
        this.currentTween?.stop();
        TWEEN.removeAll();

        this.isMoving = false;
        this.activeGroup = [];
        this.scene.remove(this.pivot);
        this.pivot.clear();

        for (let piece of this.pieces) {
            piece.position.setFromEuler((piece as any)["initialPosition"]);
            piece.updateMatrixWorld()
            piece.applyMatrix4(this.pivot.matrixWorld);
            (piece as any)["rubikPosition"] = piece.position.clone();
        }

        this.createCube();
        this.moveQueue = this.stringToMoves(this.parseAlgorithToString(this.bldNotationToAlgorithm(this.currentAlgorithmString)));
    }

    public stopExecution() {
        this.isMoving = false;
    }

    public startExecution() {
        this.reset();
        this.startMove();
    }

    public render(): void {
        this.controls.update();
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(() => { this.render(); });
    }

    public animate(): void {
        // We have to run this outside angular zones,
        // because it could trigger heavy changeDetection cycles.
        this.ngZone.runOutsideAngular(() => {
            if (document.readyState !== 'loading') {
                this.render();
            } else {
                window.addEventListener('DOMContentLoaded', () => { this.render(); });
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

        // const axesHelper = new THREE.AxesHelper(20);
        // this.scene.add(axesHelper);
        this.controls = new OrbitControls(this.camera, this.renderer.domElement);

        this.createCube();
    }

    public createCube(): void {
        // Create pieces
        for (let x = 0; x < 3; ++x) {
            for (let y = 0; y < 3; ++y) {
                for (let z = 0; z < 3; ++z) {
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

                    if (planePositions.length == 0)
                        continue;

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
                    (piece as any)["initialPosition"] = piece.position.clone();
                    (piece as any)["initialRotation"] = piece.rotation.clone();
                    this.pieces.push(piece)
                    this.scene.add(piece)
                }
            }
        }
    }

    private nearlyEqual(a: number, b: number, d = 0.001) {
        return Math.abs(a - b) <= d;
    }

    public setActiveGroup(move: Move): void {
        this.activeGroup = [];
        switch (move.moveType) {
            case "x":
            case "y":
            case "z":
                this.pieces.forEach(p => this.activeGroup.push(p))
                return;
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
            case "M":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].x, 0)) { this.activeGroup.push(p) } })
                break;
            case "E":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].y, 0)) { this.activeGroup.push(p) } })
                break;
            case "S":
                this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].z, 0)) { this.activeGroup.push(p) } })
                break;
            default:
                break;
        }

        if (move.wide) {
            if (move.moveType == "U" || move.moveType == "D") { this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].y, 0)) { this.activeGroup.push(p) } }) }
            if (move.moveType == "R" || move.moveType == "L") { this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].x, 0)) { this.activeGroup.push(p) } }) }
            if (move.moveType == "F" || move.moveType == "B") { this.pieces.forEach(p => { if (this.nearlyEqual((p as any)["rubikPosition"].z, 0)) { this.activeGroup.push(p) } }) }
        }
    }

    private startMove(): void {
        let move = this.moveQueue.shift();
        if (move) {
            if (!this.isMoving) {
                this.isMoving = true;
                this.currentMove = move;

                this.setActiveGroup(this.currentMove);
                this.pivot.rotation.set(0, 0, 0);
                this.pivot.updateMatrixWorld();
                this.scene.add(this.pivot);

                for (let piece of this.activeGroup) {
                    this.scene.remove(piece)
                    this.pivot.add(piece);
                }
                let xyz = MoveType[this.currentMove.moveType];
                let rotationAngle = (this.currentMove.double ? Math.PI : Math.PI / 2) * this.currentMove.direction;
                let target = {}; target[xyz] = rotationAngle;
                this.currentTween = new TWEEN.Tween(this.pivot.rotation).to(target, this.moveRotationTime)
                    .easing(TWEEN.Easing.Quadratic.InOut)
                    .onComplete(() => this.completeMove())
                    .start();

            }
        }
    }

    private completeMove(): void {
        this.isMoving = false;
        this.currentMove = undefined;

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
        this.startMove();
    }


    private parseAlgorithToString(alg: Algorithm): string {
        let setup = alg.parts.filter(p => p.name == "setup").length > 0 ? alg.parts.filter(p => p.name == "setup")[0].algString : "";
        alg.parts = alg.parts.filter(p => p.name != "setup");
        let ii1 = alg.parts[0].algString;
        let ii2 = alg.parts[1].algString;
        return setup + " " + ii1 + " " + ii2 + " " + this.reverseAlgorithm(ii1) + " " + this.reverseAlgorithm(ii2) + " " + this.reverseAlgorithm(setup);
    }

    private bldNotationToAlgorithm(bldNotationString: string): Algorithm {
        let parsedAlg = new Algorithm();

        // Losely check format
        if (bldNotationString.substr(0, 1) != "[" || bldNotationString.slice(-1) != "]") {
            console.error("Illegal bldNotationString")
            return null;
        }
        // Remove [] 
        bldNotationString = bldNotationString.substr(1, bldNotationString.length - 2)
        let insertInterChange = bldNotationString.replace("[", "").replace("]", "").split(",");
        if (bldNotationString.includes(":")) {
            parsedAlg.parts.push({
                name: "setup",
                algString: bldNotationString.split(":")[0].trim()
            });
            insertInterChange = bldNotationString.split(":")[1].replace("[", "").replace("]", "").split(",");
        }
        parsedAlg.parts.push({
            name: insertInterChange[0].length < insertInterChange[1].length ? "interchange" : "insert",
            algString: insertInterChange[0].trim()
        });
        parsedAlg.parts.push({
            name: insertInterChange[1].length < insertInterChange[0].length ? "interchange" : "insert",
            algString: insertInterChange[1].trim()
        });
        return parsedAlg;
    }

    private reverseAlgorithm(alg: string): string {
        return alg.split(" ").map(t => {
            if (t.includes("2")) return t
            if (t.includes("'"))
                return t.replace("'", "");
            return t + "'";
        }).reverse().join(" ");
    }

    private stringToMoves(s: string): any[] {
        return s.split(" ").map(t => this.tokenToMove(t))
    }

    private tokenToMove(token: string) {
        return {
            moveType: token.substr(0, 1),
            direction: token.toLowerCase().includes("'") ? 1 : -1,
            wide: token.toLowerCase().includes("w"),
            double: token.toLowerCase().includes("2"),
        }
    }
}
