import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CubeService } from './cube.service';

@Component({
    selector: 'app-cube',
    templateUrl: './cube.component.html',
    styleUrls: ['./cube.component.scss']
})
export class CubeComponent implements OnInit {

    @ViewChild('rendererCanvas', { static: true })
    public rendererCanvas: ElementRef<HTMLCanvasElement>;

    public constructor(private engServ: CubeService) {
    }

    public ngOnInit(): void {
        this.engServ.init(this.rendererCanvas);
    }
}
