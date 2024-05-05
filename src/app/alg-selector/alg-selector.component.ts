import { Component, NgZone, OnInit } from '@angular/core';
import { CubeService } from 'app/cube/cube.service';
import { Algorithm, Move } from 'app/util';
import { corners } from './algs';

@Component({
    selector: 'app-alg-selector',
    templateUrl: './alg-selector.component.html',
    styleUrls: ['./alg-selector.component.scss']
})
export class AlgSelectorComponent implements OnInit {

    public options: Algorithm[] = corners;

    public selectedAlgorithmName: string = corners[0].name;
    public selectedAlgorithmString: string = corners[0].string;
    public currentPart: string;

    public isFocusMode: boolean = false;
    public isExecuting: boolean = false;

    constructor(private cubeService: CubeService, private ngZone: NgZone) { }

    ngOnInit(): void {
        this.onAlgorithmChange(null);
        this.cubeService.currentMove$.subscribe((currentMove: Move) => {
            console.log(currentMove)
            this.ngZone.run(() => {
                this.currentPart = currentMove.partName;
            });
        })
    }

    onAlgorithmChange(event: any): void {
        let alg = this.options.filter(c => c.name == this.selectedAlgorithmName)[0]
        this.selectedAlgorithmString = alg.string;
        this.cubeService.setAlgorithm(alg);
    }

    toggleFocusMode(): void {
        this.isFocusMode = !this.isFocusMode;
        this.cubeService.setFocusMode(this.isFocusMode);
    }

    toggleExecution() {
        this.isExecuting = !this.isExecuting;
        if (this.isExecuting) {
            this.cubeService.continueExecution();
        } else {
            this.cubeService.stopExecution();
        }
    }

    reset() {
        this.isExecuting = false;
        this.cubeService.reset();
    }
}
