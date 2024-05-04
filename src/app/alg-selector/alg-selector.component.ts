import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { corners } from './algs';
import { CubeService } from 'app/cube/cube.service';

@Component({
    selector: 'app-alg-selector',
    templateUrl: './alg-selector.component.html',
    styleUrls: ['./alg-selector.component.scss']
})
export class AlgSelectorComponent {

    constructor(private cubeService: CubeService) { }

    onChanges(event: any): void {
        let alg = this.options.filter(c => c.name == this.selectedAlgorithmName)[0]
        console.log({ alg })
        this.cubeService.pushNewAlgorithm(this.cubeService.bldNotationToAlgorithm(alg.name, alg.algorithm));
    }

    public options = corners;

    public selectedAlgorithmName: string = corners[0].name;

}
