import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { AssinaturaRequest, TipoAssinatura } from '../../../core/models';

export interface AssinaturaDialogData {
  titulo: string;
  subtitulo?: string;
}

/**
 * Captura uma assinatura digital para uma decisão (Análise da Assessoria ou
 * Despacho da Superintendência) — dois modos:
 *  - Eletrônica simples: desenhar o traço na tela (canvas).
 *  - Certificado digital: fluxo de upload de .pfx/.p12 + titular declarado —
 *    **simulado**, sem validação criptográfica real (ver aviso na tela e
 *    AssinaturaDigital entity no backend). Nunca lê/envia o conteúdo do
 *    arquivo do certificado, só o nome — evita tratar chave privada por engano.
 */
@Component({
  selector: 'app-assinatura-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="assinatura-dialog">
      <div class="assinatura-dialog__header">
        <h2>{{ data.titulo }}</h2>
        <button mat-icon-button (click)="fechar()" aria-label="Fechar">
          <mat-icon>close</mat-icon>
        </button>
      </div>
      @if (data.subtitulo) {
        <p class="assinatura-dialog__subtitulo">{{ data.subtitulo }}</p>
      }

      <div class="assinatura-dialog__tabs">
        <button
          type="button"
          class="assinatura-dialog__tab"
          [class.assinatura-dialog__tab--ativa]="modo() === 'ELETRONICA_SIMPLES'"
          (click)="modo.set('ELETRONICA_SIMPLES')"
        >
          <mat-icon>draw</mat-icon>
          Assinatura eletrônica
        </button>
        <button
          type="button"
          class="assinatura-dialog__tab"
          [class.assinatura-dialog__tab--ativa]="modo() === 'CERTIFICADO_SIMULADO'"
          (click)="modo.set('CERTIFICADO_SIMULADO')"
        >
          <mat-icon>badge</mat-icon>
          Certificado digital
        </button>
      </div>

      @if (modo() === 'ELETRONICA_SIMPLES') {
        <p class="assinatura-dialog__instrucao">Assine com o mouse ou o dedo no quadro abaixo.</p>
        <div class="assinatura-dialog__canvas-wrap">
          <canvas
            #canvas
            class="assinatura-dialog__canvas"
            (pointerdown)="aoPressionar($event)"
            (pointermove)="aoMover($event)"
            (pointerup)="aoSoltar()"
            (pointerleave)="aoSoltar()"
          ></canvas>
          @if (!temTraco()) {
            <span class="assinatura-dialog__placeholder">assine aqui</span>
          }
        </div>
        <button mat-stroked-button type="button" (click)="limpar()">
          <mat-icon>backspace</mat-icon>
          Limpar
        </button>
      } @else {
        <div class="assinatura-dialog__aviso">
          <mat-icon>warning</mat-icon>
          <span>
            Modalidade ainda <strong>simulada</strong> — sem validação criptográfica real nem
            integração com um provedor ICP-Brasil (Certisign, BirdID, gov.br etc.). Não tem
            validade jurídica ainda.
          </span>
        </div>

        <form [formGroup]="formCertificado" class="assinatura-dialog__form">
          <label class="assinatura-dialog__arquivo">
            <mat-icon>upload_file</mat-icon>
            <span>{{ nomeArquivoCertificado() || 'Selecionar certificado (.pfx/.p12)' }}</span>
            <input type="file" accept=".pfx,.p12" hidden (change)="selecionarCertificado($event)" />
          </label>

          <mat-form-field appearance="outline">
            <mat-label>Senha do certificado</mat-label>
            <input matInput type="password" formControlName="senha" />
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Nome do titular do certificado</mat-label>
            <input matInput formControlName="titular" />
          </mat-form-field>
        </form>
      }

      <div class="assinatura-dialog__acoes">
        <button mat-stroked-button type="button" (click)="fechar()">Cancelar</button>
        <button mat-flat-button color="primary" type="button" [disabled]="!podeConfirmar()" (click)="confirmar()">
          <mat-icon>check</mat-icon>
          Confirmar assinatura
        </button>
      </div>
    </div>
  `,
  styles: [
    `
      .assinatura-dialog {
        padding: 24px;
        width: 100%;
        max-width: 480px;
      }
      .assinatura-dialog__header {
        display: flex;
        align-items: center;
        justify-content: space-between;
      }
      .assinatura-dialog__header h2 {
        font-size: 20px;
        font-weight: 600;
        color: var(--color-text-primary);
        margin: 0;
      }
      .assinatura-dialog__subtitulo {
        font-size: 13px;
        color: var(--color-text-secondary);
        margin-top: 4px;
      }
      .assinatura-dialog__tabs {
        display: flex;
        gap: 8px;
        margin: 16px 0;
      }
      .assinatura-dialog__tab {
        flex: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border: 1px solid var(--color-border);
        background: var(--color-surface);
        border-radius: var(--radius-sm);
        padding: 10px;
        font-size: 13px;
        font-weight: 500;
        color: var(--color-text-secondary);
        cursor: pointer;

        &--ativa {
          border-color: var(--color-primary);
          color: var(--color-primary);
          background: var(--chip-info-bg);
        }
      }
      .assinatura-dialog__instrucao {
        font-size: 12px;
        color: var(--color-text-secondary);
        margin: 0 0 8px;
      }
      .assinatura-dialog__canvas-wrap {
        position: relative;
        border: 1px dashed var(--color-border);
        border-radius: var(--radius-sm);
        background: var(--color-bg-page);
        margin-bottom: 12px;
      }
      .assinatura-dialog__canvas {
        display: block;
        width: 100%;
        height: 180px;
        touch-action: none;
        cursor: crosshair;
      }
      .assinatura-dialog__placeholder {
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        color: var(--color-text-secondary);
        font-size: 13px;
        pointer-events: none;
        opacity: 0.6;
      }
      .assinatura-dialog__aviso {
        display: flex;
        align-items: flex-start;
        gap: 10px;
        background: var(--banner-bg);
        border: 1px solid var(--banner-border);
        border-radius: var(--radius-sm);
        padding: 12px 14px;
        font-size: 12.5px;
        color: var(--color-text-primary);
        margin-bottom: 16px;

        .mat-icon {
          color: var(--color-warn);
          flex-shrink: 0;
        }
      }
      .assinatura-dialog__form {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .assinatura-dialog__arquivo {
        display: flex;
        align-items: center;
        gap: 8px;
        border: 1px solid var(--color-border);
        border-radius: var(--radius-sm);
        padding: 10px 14px;
        font-size: 13px;
        color: var(--color-text-primary);
        cursor: pointer;
        background: var(--color-surface);

        &:hover {
          border-color: var(--color-primary);
        }
      }
      .assinatura-dialog__acoes {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 16px;
        margin-top: 20px;
      }
    `,
  ],
})
export class AssinaturaDialogComponent implements AfterViewInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<AssinaturaDialogComponent, AssinaturaRequest | undefined>>(
    MatDialogRef
  );
  readonly data = inject<AssinaturaDialogData>(MAT_DIALOG_DATA);

  @ViewChild('canvas') private readonly canvasRef?: ElementRef<HTMLCanvasElement>;
  private ctx?: CanvasRenderingContext2D;
  private desenhando = false;

  readonly modo = signal<TipoAssinatura>('ELETRONICA_SIMPLES');
  readonly temTraco = signal(false);
  readonly nomeArquivoCertificado = signal<string | null>(null);

  readonly formCertificado = this.fb.nonNullable.group({
    senha: [''],
    titular: ['', Validators.required],
  });

  ngAfterViewInit(): void {
    queueMicrotask(() => this.configurarCanvas());
  }

  private configurarCanvas(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 2.4;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.ctx = ctx;
  }

  private posicao(evento: PointerEvent): { x: number; y: number } {
    const rect = this.canvasRef!.nativeElement.getBoundingClientRect();
    return { x: evento.clientX - rect.left, y: evento.clientY - rect.top };
  }

  aoPressionar(evento: PointerEvent): void {
    if (!this.ctx) return;
    this.desenhando = true;
    const { x, y } = this.posicao(evento);
    this.ctx.beginPath();
    this.ctx.moveTo(x, y);
  }

  aoMover(evento: PointerEvent): void {
    if (!this.desenhando || !this.ctx) return;
    const { x, y } = this.posicao(evento);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.temTraco.set(true);
  }

  aoSoltar(): void {
    this.desenhando = false;
  }

  limpar(): void {
    const canvas = this.canvasRef?.nativeElement;
    if (!canvas || !this.ctx) return;
    this.ctx.clearRect(0, 0, canvas.width, canvas.height);
    this.temTraco.set(false);
  }

  /** Só guarda o nome do arquivo — nunca lê/envia o conteúdo do certificado (chave privada). */
  selecionarCertificado(evento: Event): void {
    const arquivo = (evento.target as HTMLInputElement).files?.[0];
    this.nomeArquivoCertificado.set(arquivo?.name ?? null);
  }

  podeConfirmar(): boolean {
    if (this.modo() === 'ELETRONICA_SIMPLES') return this.temTraco();
    return !!this.nomeArquivoCertificado() && this.formCertificado.controls.titular.valid;
  }

  fechar(): void {
    this.dialogRef.close(undefined);
  }

  confirmar(): void {
    if (!this.podeConfirmar()) return;

    if (this.modo() === 'ELETRONICA_SIMPLES') {
      const dataUrl = this.canvasRef?.nativeElement.toDataURL('image/png');
      this.dialogRef.close({ tipo: 'ELETRONICA_SIMPLES', imagemAssinaturaBase64: dataUrl });
      return;
    }

    this.dialogRef.close({
      tipo: 'CERTIFICADO_SIMULADO',
      certificadoNomeArquivo: this.nomeArquivoCertificado() ?? undefined,
      titularCertificado: this.formCertificado.controls.titular.value,
    });
  }
}
