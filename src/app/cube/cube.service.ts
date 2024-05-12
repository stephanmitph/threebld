import * as THREE from 'three';
import { AfterViewInit, ElementRef, Injectable, Input, NgZone, OnChanges, OnDestroy, SimpleChanges } from '@angular/core';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import { RoundedPlaneGeometry } from './RoundedPlaneGeometry.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader';
import * as TWEEN from '@tweenjs/tween.js';
import { Subject } from 'rxjs';
import { BoxGeometry } from 'three';
import { letterscheme, letterscheme_buffer } from './letterscheme';
import { Move, Algorithm, MoveType, MoveDirectionCorrection } from 'app/util';

@Injectable({ providedIn: 'root' })
export class CubeService implements OnDestroy {
    // Three.js options
    private canvas: HTMLCanvasElement;
    private wrapper: HTMLCanvasElement;
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
    private isMoving = false; // Is a move currently performed
    private isExecuting = false; // Is the Algorithm currently being performed
    private currentMove: Move;
    private currentTween: TWEEN.Tween<any>;

    // Options for from outside
    public moveRotationTime = 600;
    public focusMode = false;
    public currentAlgorithm: Algorithm;

    private currentAlgorithmSource = new Subject<Algorithm>();
    public currentAlgorithmString$ = this.currentAlgorithmSource.asObservable();

    private currentMoveSource = new Subject<Move>();
    public currentMove$ = this.currentMoveSource.asObservable();

    private focusModeSource = new Subject<boolean>();
    public focusMode$ = this.focusModeSource.asObservable();

    public constructor(private ngZone: NgZone) {
        this.currentAlgorithmString$.subscribe(alg => {
            this.currentAlgorithm = alg;
            this.reset();
        });
        this.focusMode$.subscribe(b => {
            this.focusMode = b;
            this.reset();
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

    public setAlgorithm(alg: Algorithm) {
        this.currentAlgorithmSource.next(alg);
    }

    public setFocusMode(b: boolean) {
        this.focusModeSource.next(b);
    }

    public init(canvas: ElementRef<HTMLCanvasElement>, wrapper: ElementRef<HTMLCanvasElement>) {
        this.wrapper = wrapper.nativeElement;
        this.createScene(canvas);
        this.animate();
    }

    public reset() {
        this.currentTween?.stop();
        TWEEN.removeAll();

        this.isMoving = false;
        this.isExecuting = false;
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
        this.moveQueue = this.currentAlgorithm.getMoves();
    }

    public stopExecution() {
        this.isExecuting = false;
    }

    public continueExecution() {
        if (this.moveQueue.length == 0) {
            this.reset();
        }
        this.isExecuting = true;
        this.startMove();
    }

    private render(): void {
        this.controls.update();
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
        this.frameId = requestAnimationFrame(() => { this.render(); });
    }

    private animate(): void {
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
        const width = this.wrapper.getBoundingClientRect().width;
        const height = this.wrapper.getBoundingClientRect().height;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();

        this.renderer.setSize(width, height);
    }

    private createScene(canvas: ElementRef<HTMLCanvasElement>): void {
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
        this.camera.position.set(29, 29, 29);
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

    private createCube(): void {
        // Create pieces
        for (let x = 0; x < 3; ++x) {
            for (let y = 0; y < 3; ++y) {
                for (let z = 0; z < 3; ++z) {
                    let piece = new THREE.Group();

                    let boxGeometry = new RoundedBoxGeometry(this.pieceSize, this.pieceSize, this.pieceSize, 3, 0.2);
                    let boxMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(0x333333), transparent: false, opacity: 0.12 });

                    if (this.focusMode) {
                        boxGeometry = new BoxGeometry(this.pieceSize, this.pieceSize, this.pieceSize, 3, 1);
                        boxMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(0xDDDDDD), transparent: true, opacity: 0.12 });
                    }

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

                    if (planePositions.length == 0) // Skip middle piece
                        continue;

                    const color = [0xff8c0a, 0xef3923, 0xffef48, 0xfff7ff, 0x41aac8, 0x82ca38]
                    for (let planePosition of planePositions) {
                        let isFocusLetter = false;
                        let planeMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(color[planePosition]) });

                        if (this.focusMode && this.currentAlgorithm !== undefined) {
                            let focusLetters = letterscheme.filter(l => l.letter == this.currentAlgorithm.name.substr(0, 1)
                                || l.letter == this.currentAlgorithm.name.substr(1, 2)
                                || l.letter == letterscheme_buffer)
                            for (let l of focusLetters) {
                                if (l.x == x && l.y == y && l.z == z && l.sidePos == planePosition) {
                                    planeMaterial = new THREE.MeshMatcapMaterial({ color: new THREE.Color(l.letter == letterscheme_buffer ? 0x00FF00 : 0xFF00FF) });
                                    isFocusLetter = true;
                                }
                            }
                        }

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

                        if (!this.focusMode || this.focusMode && isFocusLetter)
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

    // Selects the correct pieces for each move
    private setActiveGroup(move: Move): void {
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
        if (!this.isExecuting) return;
        if (this.moveQueue.length == 0) {
            this.isExecuting = false;
            this.currentMoveSource.next(null);
            return;
        }
        if (!this.isMoving) {
            let move = this.moveQueue.shift();
            this.currentMoveSource.next(move);
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
            let rotationAngle = (this.currentMove.double ? Math.PI : Math.PI / 2) * this.currentMove.direction * MoveDirectionCorrection[this.currentMove.moveType];
            let target = {}; target[xyz] = rotationAngle;
            this.currentTween = new TWEEN.Tween(this.pivot.rotation).to(target, this.moveRotationTime)
                .easing(TWEEN.Easing.Quadratic.InOut)
                .onComplete(() => this.completeMove())
                .start();

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
}
