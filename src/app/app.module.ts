import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { CubeComponent } from './cube/cube.component';
import { AlgSelectorComponent } from './alg-selector/alg-selector.component';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';


@NgModule({
    declarations: [
        AppComponent,
        CubeComponent,
        AlgSelectorComponent
    ],
    imports: [
        BrowserModule,
        AppRoutingModule,
        FormsModule,
        CommonModule
    ],
    providers: [],
    bootstrap: [AppComponent]
})
export class AppModule { }
