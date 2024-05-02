import { Component, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { corners } from './algs';
import { CubeService } from 'app/cube/cube.service';

@Component({
    selector: 'app-alg-selector',
    templateUrl: './alg-selector.component.html',
    styleUrls: ['./alg-selector.component.scss']
})
export class AlgSelectorComponent implements OnInit {


    constructor(private cubeService: CubeService) { }

    onChanges(event: any): void {
        this.cubeService.pushNewAlgorithm(this.selectedAlgorithm);
    }

    public options = corners;

    public selectedAlgorithm: string = corners[0].algorithm;


    ngOnInit(): void {
    }

}
