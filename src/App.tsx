import React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

/**
 * Componente principal do aplicativo de Processamento Digital de Imagens.
 * Permite abrir, exibir, transformar e aplicar filtros em imagens usando React, TypeScript e MUI.
 * Implementa operações morfológicas clássicas (erosão, dilatação, abertura, fechamento).
 * Todas as operações são realizadas via canvas HTML, pixel a pixel, e seguem o padrão de uso de elemento estruturante cruz (N4).
 */
function App() {
  // Estados para controle dos menus superiores
  const [anchorElArquivo, setAnchorElArquivo] =
    React.useState<null | HTMLElement>(null);
  const [anchorElTransf, setAnchorElTransf] =
    React.useState<null | HTMLElement>(null);
  const [anchorElFiltros, setAnchorElFiltros] =
    React.useState<null | HTMLElement>(null);

  // Estado para armazenar a imagem original carregada
  const [imagemOriginal, setImagemOriginal] = React.useState<string | null>(
    null
  );
  // Estado para indicar se a imagem foi modificada (após filtro ou transformação)
  const [imagemModificada, setImagemModificada] =
    React.useState<boolean>(false);
  // Estado para armazenar a imagem transformada/filtrada
  const [imagemTransformada, setImagemTransformada] = React.useState<
    string | null
  >(null);
  // Referência para o canvas oculto usado nas manipulações
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // ===================================================================
  // FUNÇÕES UTILITÁRIAS
  // ===================================================================

  /**
   * Função utilitária para carregar uma imagem no canvas e executar uma manipulação.
   * @param {string} src - Base64 da imagem a ser carregada.
   * @param {(ctx: CanvasRenderingContext2D, img: HTMLImageElement) => void} callback - Função que recebe o contexto do canvas e a imagem carregada.
   * Garante que a manipulação seja feita sobre a imagem já desenhada no canvas.
   */
  const carregarNoCanvas = (
    src: string,
    callback: (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => void
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const img = new window.Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      callback(ctx, img);
      setImagemTransformada(canvas.toDataURL());
      setImagemModificada(true);
    };
    img.src = src;
  };

  /**
   * Função utilitária para converter ImageData para tons de cinza (grayscale).
   * Aplica a média ponderada dos canais RGB em cada pixel.
   * @param {Uint8ClampedArray} data - Array de dados da imagem (ImageData.data).
   */
  const converterParaGrayscale = (data: Uint8ClampedArray) => {
    for (let i = 0; i < data.length; i += 4) {
      // Média ponderada: 0.299*R + 0.587*G + 0.114*B (mesma fórmula do handleGrayscale)
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  };

  // ===================================================================
  // HANDLERS DE ARQUIVO
  // ===================================================================

  const handleAbrirImagem = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files && event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagemOriginal(e.target?.result as string);
        setImagemTransformada(null);
        setImagemModificada(false);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = "";
    setAnchorElArquivo(null);
  };

  /**
   * Handler para remover a imagem carregada e limpar todos os estados relacionados.
   */
  const handleRemoverImagem = () => {
    setImagemOriginal(null);
    setImagemTransformada(null);
    setImagemModificada(false);
    setAnchorElArquivo(null);
  };

  /**
   * Handler para remover apenas as alterações, restaurando a imagem original.
   */
  const handleRemoverAlteracoes = () => {
    setImagemTransformada(null);
    setImagemModificada(false);
    setAnchorElArquivo(null);
  };

  /**
   * Handler para salvar a imagem transformada/filtrada como arquivo PNG.
   */
  const handleSalvarImagem = () => {
    if (imagemTransformada && imagemModificada) {
      const link = document.createElement("a");
      link.href = imagemTransformada;
      link.download = "imagem_transformada.png";
      link.click();
    }
    setAnchorElArquivo(null);
  };

  // ===================================================================
  // TRANSFORMAÇÕES GEOMÉTRICAS
  // ===================================================================

  /**
   * Handler para transladar (mover) a imagem.
   * Exemplo: desloca 50px para direita e 30px para baixo.
   */
  const handleTransladar = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.translate(50, 30); // valores fixos, pode ser parametrizado
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    });
    setAnchorElTransf(null);
  };

  /**
   * Handler para rotacionar a imagem em 90 graus.
   */
  const handleRotacionar = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      const angle = (90 * Math.PI) / 180;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.translate(img.height / 2, img.width / 2);
      ctx.rotate(angle);
      ctx.drawImage(img, -img.width / 2, -img.height / 2);
      ctx.restore();
    });
    setAnchorElTransf(null);
  };

  /**
   * Handler para espelhar a imagem horizontalmente.
   */
  const handleEspelhar = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.translate(img.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    });
    setAnchorElTransf(null);
  };

  /**
   * Handler para aumentar (zoom in) a imagem em 1.5x.
   */
  const handleAumentar = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      const scale = 1.5;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    });
    setAnchorElTransf(null);
  };

  /**
   * Handler para diminuir (zoom out) a imagem em 0.5x.
   */
  const handleDiminuir = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      const scale = 0.5;
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    });
    setAnchorElTransf(null);
  };

  // ===================================================================
  // FILTROS DE BRILHO E CONTRASTE
  // ===================================================================

  /**
   * Handler para aplicar filtro de brilho na imagem.
   * O valor de brilho é fixo para exemplo, mas pode ser parametrizado.
   */
  const handleBrilho = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const brilho = 40; // exemplo: aumenta brilho
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, data[i] + brilho));
        data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + brilho));
        data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + brilho));
      }
      ctx.putImageData(imageData, 0, 0);
      setImagemTransformada(ctx.canvas.toDataURL());
      setImagemModificada(true);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Handler para aplicar filtro de contraste na imagem.
   * O valor de contraste é fixo para exemplo, mas pode ser parametrizado.
   */
  const handleContraste = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const contraste = 30; // exemplo: aumenta contraste
      const fator = (259 * (contraste + 255)) / (255 * (259 - contraste));
      for (let i = 0; i < data.length; i += 4) {
        data[i] = Math.max(0, Math.min(255, fator * (data[i] - 128) + 128));
        data[i + 1] = Math.max(
          0,
          Math.min(255, fator * (data[i + 1] - 128) + 128)
        );
        data[i + 2] = Math.max(
          0,
          Math.min(255, fator * (data[i + 2] - 128) + 128)
        );
      }
      ctx.putImageData(imageData, 0, 0);
      setImagemTransformada(ctx.canvas.toDataURL());
      setImagemModificada(true);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Handler para aplicar filtro de tons de cinza (grayscale) na imagem.
   * Utiliza a função utilitária converterParaGrayscale para manter consistência.
   */
  const handleGrayscale = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;

      // Usar a função utilitária para conversão grayscale
      converterParaGrayscale(data);

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  // ===================================================================
  // FILTROS DE DETECÇÃO DE BORDAS E SUAVIZAÇÃO
  // ===================================================================

  /**
   * Handler para aplicar detecção de bordas usando o operador de Roberts.
   * Utiliza dois kernels 2x2 para detectar mudanças diagonais na imagem.
   * Primeiro converte para grayscale, depois aplica o gradiente de Roberts.
   * O resultado destaca as bordas da imagem.
   */
  const handleRoberts = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      // Primeiro converter para grayscale usando a função utilitária
      converterParaGrayscale(data);

      // Criar cópia dos dados em grayscale para cálculos
      const grayData = new Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        grayData[idx] = data[i]; // Já está em grayscale após conversão
      }

      // Aplicar operadores de Roberts
      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
          // Operador Gx (diagonal principal): [1, 0; 0, -1]
          const gx =
            grayData[y * width + x] - grayData[(y + 1) * width + (x + 1)];

          // Operador Gy (diagonal secundária): [0, 1; -1, 0]
          const gy =
            grayData[y * width + (x + 1)] - grayData[(y + 1) * width + x];

          // Magnitude do gradiente: sqrt(Gx² + Gy²)
          const magnitude = Math.sqrt(gx * gx + gy * gy);

          // Aplicar resultado aos canais RGB
          const pixelIndex = (y * width + x) * 4;
          const value = Math.max(0, Math.min(255, magnitude));
          data[pixelIndex] = value; // R
          data[pixelIndex + 1] = value; // G
          data[pixelIndex + 2] = value; // B
        }
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Handler para aplicar filtro de passa baixa (Blur/Suavização).
   * Utiliza kernel 3x3 (filtro da média) para suavizar a imagem, conforme o material teórico.
   * Cada pixel é substituído pela média dos seus vizinhos.
   */
  const handlePassaBaixa = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      // Kernel de suavização 3x3 (filtro da média - 9 pixels)
      const kernel = Array(9).fill(1 / 9); // Todos os 9 valores = 1/9

      // Criar cópia dos dados originais
      const originalData = new Uint8ClampedArray(data);

      // Aplicar convolução com janela 3x3
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) {
            // RGB apenas
            let sum = 0;
            for (let ky = -1; ky <= 1; ky++) {
              for (let kx = -1; kx <= 1; kx++) {
                const idx = ((y + ky) * width + (x + kx)) * 4 + c;
                const kidx = (ky + 1) * 3 + (kx + 1);
                sum += originalData[idx] * kernel[kidx];
              }
            }
            const outputIdx = (y * width + x) * 4 + c;
            data[outputIdx] = Math.max(0, Math.min(255, sum));
          }
        }
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  // ===================================================================
  // OPERAÇÕES MORFOLÓGICAS
  // ===================================================================

  /**
   * Handler para aplicar erosão morfológica.
   * Reduz regiões escuras (objetos), usando elemento estruturante cruz (N4, 3x3).
   * Opera sobre a imagem em tons de cinza.
   * Cada pixel recebe o valor MÍNIMO dos vizinhos definidos pelo elemento estruturante.
   */
  const handleErosao = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      // Converter para grayscale
      converterParaGrayscale(data);

      // Elemento estruturante cruz (N4): centro, cima, baixo, esquerda, direita
      const offsets = [
        [0, 0], // centro
        [-1, 0], // cima
        [1, 0], // baixo
        [0, -1], // esquerda
        [0, 1], // direita
      ];

      // Cópia dos dados para leitura (imagem original antes da modificação)
      const original = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let min = 255;
          for (const [dy, dx] of offsets) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            min = Math.min(min, original[idx]);
          }
          const outIdx = (y * width + x) * 4;
          data[outIdx] = data[outIdx + 1] = data[outIdx + 2] = min;
          data[outIdx + 3] = original[outIdx + 3];
        }
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Handler para aplicar dilatação morfológica.
   * Expande regiões claras (objetos), usando elemento estruturante cruz (N4, 3x3).
   * Opera sobre a imagem em tons de cinza.
   * Cada pixel recebe o valor MÁXIMO dos vizinhos definidos pelo elemento estruturante.
   */
  const handleDilatacao = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      // Converter para grayscale
      converterParaGrayscale(data);

      // Elemento estruturante cruz (N4): centro, cima, baixo, esquerda, direita
      const offsets = [
        [0, 0], // centro
        [-1, 0], // cima
        [1, 0], // baixo
        [0, -1], // esquerda
        [0, 1], // direita
      ];

      // Cópia dos dados para leitura (imagem original antes da modificação)
      const original = new Uint8ClampedArray(data);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let max = 0;
          for (const [dy, dx] of offsets) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            max = Math.max(max, original[idx]);
          }
          const outIdx = (y * width + x) * 4;
          data[outIdx] = data[outIdx + 1] = data[outIdx + 2] = max;
          data[outIdx + 3] = original[outIdx + 3];
        }
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Handler para aplicar abertura morfológica.
   * Abertura = Erosão seguida de Dilatação, usando elemento estruturante cruz (N4, 3x3).
   * Remove detalhes pequenos e suaviza contornos, conforme teoria de Morfologia Matemática.
   * Opera sobre a imagem em tons de cinza.
   */
  const handleAbertura = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      // Converter para grayscale
      converterParaGrayscale(data);

      // Elemento estruturante cruz (N4): centro, cima, baixo, esquerda, direita
      const offsets = [
        [0, 0], // centro
        [-1, 0], // cima
        [1, 0], // baixo
        [0, -1], // esquerda
        [0, 1], // direita
      ];

      // --- Erosão ---
      // Aplica erosão usando elemento estruturante cruz (N4)
      const originalErosao = new Uint8ClampedArray(data);
      const tempErosao = new Uint8ClampedArray(originalErosao);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let min = 255;
          for (const [dy, dx] of offsets) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            min = Math.min(min, originalErosao[idx]); // só canal R
          }
          const outIdx = (y * width + x) * 4;
          tempErosao[outIdx] =
            tempErosao[outIdx + 1] =
            tempErosao[outIdx + 2] =
              min;
          tempErosao[outIdx + 3] = originalErosao[outIdx + 3];
        }
      }

      // --- Dilatação sobre o resultado da erosão ---
      // Aplica dilatação sobre o resultado da erosão
      const tempDilatacao = new Uint8ClampedArray(tempErosao);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let max = 0;
          for (const [dy, dx] of offsets) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            max = Math.max(max, tempErosao[idx]); // só canal R
          }
          const outIdx = (y * width + x) * 4;
          tempDilatacao[outIdx] =
            tempDilatacao[outIdx + 1] =
            tempDilatacao[outIdx + 2] =
              max;
          tempDilatacao[outIdx + 3] = tempErosao[outIdx + 3];
        }
      }

      // Copia o resultado final para imageData
      for (let i = 0; i < data.length; i++) {
        data[i] = tempDilatacao[i];
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Handler para aplicar fechamento morfológico.
   * Fechamento = Dilatação seguida de Erosão, usando elemento estruturante cruz (N4, 3x3).
   * Preenche pequenos buracos e conecta regiões próximas, conforme teoria de Morfologia Matemática.
   * Opera sobre a imagem em tons de cinza.
   */
  const handleFechamento = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      // Converter para grayscale
      converterParaGrayscale(data);

      // Elemento estruturante cruz (N4): centro, cima, baixo, esquerda, direita
      const offsets = [
        [0, 0], // centro
        [-1, 0], // cima
        [1, 0], // baixo
        [0, -1], // esquerda
        [0, 1], // direita
      ];

      // --- Dilatação ---
      // Aplica dilatação usando elemento estruturante cruz (N4)
      const originalDilatacao = new Uint8ClampedArray(data);
      const tempDilatacao = new Uint8ClampedArray(originalDilatacao);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let max = 0;
          for (const [dy, dx] of offsets) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            max = Math.max(max, originalDilatacao[idx]); // só canal R
          }
          const outIdx = (y * width + x) * 4;
          tempDilatacao[outIdx] =
            tempDilatacao[outIdx + 1] =
            tempDilatacao[outIdx + 2] =
              max;
          tempDilatacao[outIdx + 3] = originalDilatacao[outIdx + 3];
        }
      }

      // --- Erosão sobre o resultado da dilatação ---
      // Aplica erosão sobre o resultado da dilatação
      const tempErosao = new Uint8ClampedArray(tempDilatacao);
      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          let min = 255;
          for (const [dy, dx] of offsets) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            min = Math.min(min, tempDilatacao[idx]); // só canal R
          }
          const outIdx = (y * width + x) * 4;
          tempErosao[outIdx] =
            tempErosao[outIdx + 1] =
            tempErosao[outIdx + 2] =
              min;
          tempErosao[outIdx + 3] = tempDilatacao[outIdx + 3];
        }
      }

      // Copia o resultado final para imageData
      for (let i = 0; i < data.length; i++) {
        data[i] = tempErosao[i];
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  // ===================================================================
  // OPERAÇÃO DE AFINAMENTO (ESQUELETIZAÇÃO)
  // ===================================================================

  /**
   * Handler para aplicar afinamento (esqueletização) usando o algoritmo de Zhang-Suen.
   * O algoritmo é aplicado sobre uma imagem binária (preto e branco).
   * O resultado é um esqueleto fino do objeto.
   */
  const handleZhangSuen = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(
      imagemOriginal,
      (ctx: CanvasRenderingContext2D, img: HTMLImageElement) => {
        ctx.drawImage(img, 0, 0);
        const imageData = ctx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;
        const width = img.width;
        const height = img.height;

        // 1. Converter para grayscale
        converterParaGrayscale(data);

        // 2. Binarizar (threshold fixo 128)
        for (let i = 0; i < data.length; i += 4) {
          const v = data[i] < 128 ? 1 : 0; // preto = 1, branco = 0
          data[i] = data[i + 1] = data[i + 2] = v * 255;
        }

        // 3. Criar matriz binária (1 = preto, 0 = branco)
        const bin: number[][] = [];
        for (let y = 0; y < height; y++) {
          const row: number[] = [];
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            row.push(data[idx] === 0 ? 0 : 1);
          }
          bin.push(row);
        }

        let changed = true;
        while (changed) {
          changed = false;
          const toRemove: [number, number][] = [];
          // Passo 1
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const P = [
                null,
                bin[y][x],
                bin[y - 1][x],
                bin[y - 1][x + 1],
                bin[y][x + 1],
                bin[y + 1][x + 1],
                bin[y + 1][x],
                bin[y + 1][x - 1],
                bin[y][x - 1],
                bin[y - 1][x - 1],
              ];
              if (
                P[1] === 1 &&
                (() => {
                  const n =
                    (P[2] ?? 0) +
                    (P[3] ?? 0) +
                    (P[4] ?? 0) +
                    (P[5] ?? 0) +
                    (P[6] ?? 0) +
                    (P[7] ?? 0) +
                    (P[8] ?? 0) +
                    (P[9] ?? 0);
                  return n >= 2 && n <= 6;
                })() &&
                (() => {
                  const seq = [
                    P[2],
                    P[3],
                    P[4],
                    P[5],
                    P[6],
                    P[7],
                    P[8],
                    P[9],
                    P[2],
                  ];
                  let s = 0;
                  for (let i = 0; i < 8; i++) {
                    if ((seq[i] ?? 0) === 0 && (seq[i + 1] ?? 0) === 1) s++;
                  }
                  return s === 1;
                })() &&
                (P[2] ?? 0) * (P[4] ?? 0) * (P[6] ?? 0) === 0 &&
                (P[4] ?? 0) * (P[6] ?? 0) * (P[8] ?? 0) === 0
              ) {
                toRemove.push([y, x]);
              }
            }
          }
          if (toRemove.length > 0) changed = true;
          for (const [y, x] of toRemove) bin[y][x] = 0;

          // Passo 2
          const toRemove2: [number, number][] = [];
          for (let y = 1; y < height - 1; y++) {
            for (let x = 1; x < width - 1; x++) {
              const P = [
                null,
                bin[y][x],
                bin[y - 1][x],
                bin[y - 1][x + 1],
                bin[y][x + 1],
                bin[y + 1][x + 1],
                bin[y + 1][x],
                bin[y + 1][x - 1],
                bin[y][x - 1],
                bin[y - 1][x - 1],
              ];
              if (
                P[1] === 1 &&
                (() => {
                  const n =
                    (P[2] ?? 0) +
                    (P[3] ?? 0) +
                    (P[4] ?? 0) +
                    (P[5] ?? 0) +
                    (P[6] ?? 0) +
                    (P[7] ?? 0) +
                    (P[8] ?? 0) +
                    (P[9] ?? 0);
                  return n >= 2 && n <= 6;
                })() &&
                (() => {
                  const seq = [
                    P[2],
                    P[3],
                    P[4],
                    P[5],
                    P[6],
                    P[7],
                    P[8],
                    P[9],
                    P[2],
                  ];
                  let s = 0;
                  for (let i = 0; i < 8; i++) {
                    if ((seq[i] ?? 0) === 0 && (seq[i + 1] ?? 0) === 1) s++;
                  }
                  return s === 1;
                })() &&
                (P[2] ?? 0) * (P[4] ?? 0) * (P[8] ?? 0) === 0 &&
                (P[2] ?? 0) * (P[6] ?? 0) * (P[8] ?? 0) === 0
              ) {
                toRemove2.push([y, x]);
              }
            }
          }
          if (toRemove2.length > 0) changed = true;
          for (const [y, x] of toRemove2) bin[y][x] = 0;
        }

        // 4. Atualizar imageData com resultado
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const v = bin[y][x] ? 0 : 255; // preto = 1 -> 0 (preto), branco = 0 -> 255 (branco)
            data[idx] = data[idx + 1] = data[idx + 2] = v;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
    );
    setAnchorElFiltros(null);
  };

  // ===================================================================
  // HANDLERS DE MENU
  // ===================================================================

  /**
   * Abre o menu correspondente ao botão clicado.
   */
  const handleMenuOpen =
    (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) =>
    (event: React.MouseEvent<HTMLElement>) => {
      setter(event.currentTarget);
    };

  /**
   * Fecha o menu correspondente.
   */
  const handleMenuClose =
    (setter: React.Dispatch<React.SetStateAction<HTMLElement | null>>) =>
    () => {
      setter(null);
    };

  // Ref para input file oculto (usado para abrir imagem)
  const inputFileRef = React.useRef<HTMLInputElement>(null);

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            Processamento Digital de Imagens
          </Typography>
          <Box sx={{ display: "flex", gap: 2 }}>
            <Button
              color="inherit"
              onClick={handleMenuOpen(setAnchorElArquivo)}
            >
              Arquivo
            </Button>
            <Menu
              anchorEl={anchorElArquivo}
              open={Boolean(anchorElArquivo)}
              onClose={handleMenuClose(setAnchorElArquivo)}
            >
              <MenuItem onClick={() => inputFileRef.current?.click()}>
                Abrir imagem
              </MenuItem>
              <MenuItem
                onClick={handleRemoverImagem}
                disabled={!imagemOriginal}
              >
                Remover imagem
              </MenuItem>
              <MenuItem
                onClick={handleRemoverAlteracoes}
                disabled={!imagemTransformada}
              >
                Remover alterações
              </MenuItem>
              <MenuItem
                onClick={handleSalvarImagem}
                disabled={!imagemOriginal || !imagemModificada}
              >
                Salvar imagem
              </MenuItem>
            </Menu>
            <input
              type="file"
              accept="image/*"
              style={{ display: "none" }}
              ref={inputFileRef}
              onChange={handleAbrirImagem}
            />
            <Button color="inherit" onClick={handleMenuOpen(setAnchorElTransf)}>
              Transformações Geométricas
            </Button>
            <Menu
              anchorEl={anchorElTransf}
              open={Boolean(anchorElTransf)}
              onClose={handleMenuClose(setAnchorElTransf)}
            >
              <MenuItem onClick={handleTransladar} disabled={!imagemOriginal}>
                Transladar
              </MenuItem>
              <MenuItem onClick={handleRotacionar} disabled={!imagemOriginal}>
                Rotacionar
              </MenuItem>
              <MenuItem onClick={handleEspelhar} disabled={!imagemOriginal}>
                Espelhar
              </MenuItem>
              <MenuItem onClick={handleAumentar} disabled={!imagemOriginal}>
                Aumentar
              </MenuItem>
              <MenuItem onClick={handleDiminuir} disabled={!imagemOriginal}>
                Diminuir
              </MenuItem>
            </Menu>
            <Button
              color="inherit"
              onClick={handleMenuOpen(setAnchorElFiltros)}
            >
              Filtros
            </Button>
            <Menu
              anchorEl={anchorElFiltros}
              open={Boolean(anchorElFiltros)}
              onClose={handleMenuClose(setAnchorElFiltros)}
            >
              <MenuItem onClick={handleBrilho} disabled={!imagemOriginal}>
                Brilho
              </MenuItem>
              <MenuItem onClick={handleContraste} disabled={!imagemOriginal}>
                Contraste
              </MenuItem>
              <MenuItem onClick={handleGrayscale} disabled={!imagemOriginal}>
                Grayscale
              </MenuItem>
              <MenuItem onClick={handleRoberts} disabled={!imagemOriginal}>
                Detecção de Bordas (Roberts)
              </MenuItem>
              <MenuItem onClick={handlePassaBaixa} disabled={!imagemOriginal}>
                Filtro Passa Baixa (Filtro da Média)
              </MenuItem>
              <MenuItem onClick={handleErosao} disabled={!imagemOriginal}>
                Erosão (Morfologia)
              </MenuItem>
              <MenuItem onClick={handleDilatacao} disabled={!imagemOriginal}>
                Dilatação (Morfologia)
              </MenuItem>
              <MenuItem onClick={handleAbertura} disabled={!imagemOriginal}>
                Abertura (Morfologia)
              </MenuItem>
              <MenuItem onClick={handleFechamento} disabled={!imagemOriginal}>
                Fechamento (Morfologia)
              </MenuItem>
              <MenuItem onClick={handleZhangSuen} disabled={!imagemOriginal}>
                Afinamento (Zhang-Suen)
              </MenuItem>
            </Menu>
          </Box>
        </Toolbar>
      </AppBar>
      <Box sx={{ p: 2, display: "flex", flexDirection: "column", gap: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "center", gap: 4 }}>
          <Box
            sx={{
              border: "1px solid #ccc",
              borderRadius: 2,
              width: 350,
              height: 350,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {imagemOriginal ? (
              <img
                src={imagemOriginal}
                alt="Imagem Original"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            ) : (
              <Typography variant="subtitle1">Imagem Original</Typography>
            )}
          </Box>
          <Box
            sx={{
              border: "1px solid #ccc",
              borderRadius: 2,
              width: 350,
              height: 350,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "#fafafa",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {imagemTransformada ? (
              <img
                src={imagemTransformada}
                alt="Imagem Transformada"
                style={{ maxWidth: "100%", maxHeight: "100%" }}
              />
            ) : (
              <Typography variant="subtitle1">Imagem Transformada</Typography>
            )}
          </Box>
          {/* Canvas oculto para manipulação */}
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </Box>
      </Box>
    </Box>
  );
}

export default App;
