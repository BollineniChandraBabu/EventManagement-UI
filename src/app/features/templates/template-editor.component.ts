import { AfterViewInit, Component, ElementRef, ViewChild, inject } from '@angular/core';
import { CommonModule, AsyncPipe } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { ApiService } from '../../core/services/api.service';
import grapesjs from 'grapesjs';

@Component({
  standalone: true,
  imports: [CommonModule, MatCardModule, MatButtonModule, MatListModule, AsyncPipe],
  template: `<div class="page"><mat-card>
    <h2>Template Editor (GrapesJS)</h2>
    <div style="margin-bottom:8px">Variables: {{'{{name}}'}}, {{'{{relation}}'}}, {{'{{eventDate}}'}}, {{'{{festival}}'}}</div>
    <div #editor style="height: 420px; border: 1px solid #ddd"></div>
    <button mat-raised-button color="primary" (click)="saveTemplate()">Save template</button>
    <h3>Version history</h3>
    <mat-list>
      <mat-list-item *ngFor="let v of (versions$ | async) ?? []">
        #{{v.id}} - {{v.updatedAt}}
        <button mat-button (click)="restore(v.id)">Restore</button>
      </mat-list-item>
    </mat-list>
  </mat-card></div>`
})
export class TemplateEditorComponent implements AfterViewInit {
  @ViewChild('editor', { static: true }) editorEl!: ElementRef<HTMLDivElement>;
  private readonly api = inject(ApiService);
  private editor?: any;
  versions$ = this.api.templateVersions();

  ngAfterViewInit(): void {
    this.editor = grapesjs.init({ container: this.editorEl.nativeElement, fromElement: false, height: '420px', storageManager: false, components: '<table><tr><td>Hello {{name}}, happy {{festival}}!</td></tr></table>' });
  }

  saveTemplate() { this.api.saveTemplate({ html: this.editor?.getHtml(), css: this.editor?.getCss() }).subscribe(() => this.versions$ = this.api.templateVersions()); }
  restore(id: number) { this.api.restoreTemplate(id).subscribe(() => this.versions$ = this.api.templateVersions()); }
}
