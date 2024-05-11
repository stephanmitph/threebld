import { AfterViewInit, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import { CubeService } from './cube.service';

@Component({
    selector: 'app-cube',
    templateUrl: './cube.component.html',
    styleUrls: ['./cube.component.scss']
})
export class CubeComponent implements OnInit, AfterViewInit {

    @ViewChild('rendererCanvas', { static: true })
    public rendererCanvas: ElementRef<HTMLCanvasElement>;

    @ViewChild('wrapper', { static: true })
    public wrapper: ElementRef<HTMLCanvasElement>;

    public constructor(private cubeService: CubeService) { }

    ngAfterViewInit(): void {
        this.cubeService.resize();
    }

    public ngOnInit(): void {
        this.cubeService.init(this.rendererCanvas, this.wrapper);
    }
}
