import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { CubeService } from 'app/cube/cube.service';
import { corners } from './algs';

@Component({
    selector: 'app-alg-selector',
    templateUrl: './alg-selector.component.html',
    styleUrls: ['./alg-selector.component.scss']
})
export class AlgSelectorComponent implements OnInit {

    public options = corners;

    public selectedAlgorithmName: string = corners[0].name;
    public selectedAlgorithmString: string = corners[0].algorithm;

    public isFocusMode: boolean = false;

    constructor(private cubeService: CubeService) { }

    ngOnInit(): void {
        this.onChanges(null);
    }

    onChanges(event: any): void {
        let alg = this.options.filter(c => c.name == this.selectedAlgorithmName)[0]
        this.selectedAlgorithmString = alg.algorithm;
        this.cubeService.pushNewAlgorithm(this.cubeService.bldNotationToAlgorithm(alg.name, alg.algorithm));
    }

    onFocusModeChnage(event: any): void {
        this.cubeService.updateFocusMode(this.isFocusMode);
    }
}
