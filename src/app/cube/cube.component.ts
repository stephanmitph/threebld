import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { EngineService } from './cube.service';

@Component({
    selector: 'app-cube',
    templateUrl: './cube.component.html',
    styleUrls: ['./cube.component.scss']
})
export class CubeComponent implements OnInit {

    @ViewChild('rendererCanvas', { static: true })
    public rendererCanvas: ElementRef<HTMLCanvasElement>;

    public constructor(private engServ: EngineService) {
    }

    public ngOnInit(): void {
        this.engServ.createScene(this.rendererCanvas);
        this.engServ.animate();
    }
}
