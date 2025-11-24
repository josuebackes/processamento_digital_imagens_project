import React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import Menu from "@mui/material/Menu";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";

/**
 * Aplicativo de Processamento Digital de Imagens.
 * Implementa filtros, transformações geométricas e operações morfológicas.
 */
function App() {
  // Estados para controle da aplicação
  const [anchorElArquivo, setAnchorElArquivo] =
    React.useState<null | HTMLElement>(null);
  const [anchorElTransf, setAnchorElTransf] =
    React.useState<null | HTMLElement>(null);
  const [anchorElFiltros, setAnchorElFiltros] =
    React.useState<null | HTMLElement>(null);
  const [anchorElCaracteristicas, setAnchorElCaracteristicas] =
    React.useState<null | HTMLElement>(null);
  const [imagemOriginal, setImagemOriginal] = React.useState<string | null>(
    null
  );
  const [imagemModificada, setImagemModificada] =
    React.useState<boolean>(false);
  const [imagemTransformada, setImagemTransformada] = React.useState<
    string | null
  >(null);
  const [resultadoDomino, setResultadoDomino] = React.useState<{
    pontosSuperior: number;
    pontosInferior: number;
  } | null>(null);
  const canvasRef = React.useRef<HTMLCanvasElement>(null);

  // ===================================================================
  // FUNÇÕES UTILITÁRIAS
  // ===================================================================

  /**
   * Carrega uma imagem no canvas e executa uma manipulação.
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
   * Converte ImageData para tons de cinza usando média ponderada.
   */
  const converterParaGrayscale = (data: Uint8ClampedArray) => {
    for (let i = 0; i < data.length; i += 4) {
      const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      data[i] = data[i + 1] = data[i + 2] = gray;
    }
  };

  /**
   * Binariza uma imagem em grayscale aplicando threshold.
   */
  const binarizarImagem = (
    data: Uint8ClampedArray,
    threshold: number = 128
  ) => {
    for (let i = 0; i < data.length; i += 4) {
      const value = data[i] < threshold ? 0 : 255;
      data[i] = data[i + 1] = data[i + 2] = value;
    }
  };

  /**
   * Elemento estruturante 3x3 padrão para operações morfológicas.
   */
  const ELEMENTO_ESTRUTURANTE_3X3 = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, -1],
    [0, 0],
    [0, 1],
    [1, -1],
    [1, 0],
    [1, 1],
  ];

  /**
   * Aplica erosão morfológica em dados de imagem já binarizados.
   * Função utilitária reutilizável para operações morfológicas.
   */
  const aplicarErosao = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    offsets = ELEMENTO_ESTRUTURANTE_3X3
  ): Uint8ClampedArray => {
    const result = new Uint8ClampedArray(data);
    const original = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let min = 255;
        for (const [dy, dx] of offsets) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          min = Math.min(min, original[idx]);
        }
        const outIdx = (y * width + x) * 4;
        result[outIdx] = result[outIdx + 1] = result[outIdx + 2] = min;
        result[outIdx + 3] = original[outIdx + 3];
      }
    }

    return result;
  };

  /**
   * Aplica dilatação morfológica em dados de imagem já binarizados.
   * Função utilitária reutilizável para operações morfológicas.
   */
  const aplicarDilatacao = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    offsets = ELEMENTO_ESTRUTURANTE_3X3
  ): Uint8ClampedArray => {
    const result = new Uint8ClampedArray(data);
    const original = new Uint8ClampedArray(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let max = 0;
        for (const [dy, dx] of offsets) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          max = Math.max(max, original[idx]);
        }
        const outIdx = (y * width + x) * 4;
        result[outIdx] = result[outIdx + 1] = result[outIdx + 2] = max;
        result[outIdx + 3] = original[outIdx + 3];
      }
    }

    return result;
  };

  const aplicarAbertura = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    offsets = ELEMENTO_ESTRUTURANTE_3X3
  ): Uint8ClampedArray => {
    // Passo 1: Erosão
    const erosionResult = aplicarErosao(data, width, height, offsets);
    // Passo 2: Dilatação sobre o resultado da erosão
    const dilationResult = aplicarDilatacao(
      erosionResult,
      width,
      height,
      offsets
    );
    return dilationResult;
  };

  const aplicarFechamento = (
    data: Uint8ClampedArray,
    width: number,
    height: number,
    offsets = ELEMENTO_ESTRUTURANTE_3X3
  ): Uint8ClampedArray => {
    // Passo 1: Dilatação
    const dilationResult = aplicarDilatacao(data, width, height, offsets);
    // Passo 2: Erosão sobre o resultado da dilatação
    const erosionResult = aplicarErosao(dilationResult, width, height, offsets);
    return erosionResult;
  };

  // ===================================================================
  // FUNÇÕES DE EXTRAÇÃO DE CARACTERÍSTICAS
  // ===================================================================

  /**
   * Rotula componentes conectados em uma imagem binária.
   * Identifica e conta objetos separados.
   */
  const rotularComponentes = (
    data: Uint8ClampedArray,
    width: number,
    height: number
  ): { labels: number[][]; componentes: number } => {
    const labels: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(0));
    let componenteAtual = 1;

    // Vizinhança de 8 pixels
    const dx = [-1, -1, -1, 0, 0, 1, 1, 1];
    const dy = [-1, 0, 1, -1, 1, -1, 0, 1];

    const floodFill = (startX: number, startY: number, label: number) => {
      const stack: [number, number][] = [[startX, startY]];

      while (stack.length > 0) {
        const [x, y] = stack.pop()!;

        if (x < 0 || x >= width || y < 0 || y >= height || labels[y][x] !== 0) {
          continue;
        }

        const pixelIdx = (y * width + x) * 4;
        if (data[pixelIdx] !== 0) continue; // Pixel branco, não é objeto

        labels[y][x] = label;

        // Adiciona vizinhos à pilha
        for (let i = 0; i < 8; i++) {
          const nx = x + dx[i];
          const ny = y + dy[i];
          stack.push([nx, ny]);
        }
      }
    };

    // Percorre a imagem procurando pixels pretos não rotulados
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const pixelIdx = (y * width + x) * 4;
        if (data[pixelIdx] === 0 && labels[y][x] === 0) {
          floodFill(x, y, componenteAtual);
          componenteAtual++;
        }
      }
    }

    return { labels, componentes: componenteAtual - 1 };
  };

  /**
   * Filtra componentes por área mínima para remover ruído.
   */
  const filtrarComponentesPorArea = (
    labels: number[][],
    componentes: number,
    areaMinima: number = 20
  ): { labelsLimpos: number[][]; componentesValidos: number } => {
    const width = labels[0].length;
    const height = labels.length;

    // Conta área de cada componente
    const areas: number[] = new Array(componentes + 1).fill(0);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (labels[y][x] > 0) {
          areas[labels[y][x]]++;
        }
      }
    }

    // Remove componentes pequenos
    const labelsLimpos: number[][] = Array(height)
      .fill(null)
      .map(() => Array(width).fill(0));
    let novoLabel = 1;
    const mapeamento: number[] = new Array(componentes + 1).fill(0);

    for (let i = 1; i <= componentes; i++) {
      if (areas[i] >= areaMinima) {
        mapeamento[i] = novoLabel++;
      }
    }

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (labels[y][x] > 0) {
          labelsLimpos[y][x] = mapeamento[labels[y][x]];
        }
      }
    }

    return { labelsLimpos, componentesValidos: novoLabel - 1 };
  };

  const detectarLinhaDivisoria = (height: number): number => {
    return Math.floor(height / 2);
  };

  // ===================================================================
  // ANÁLISE DE DOMINÓ
  // ===================================================================

  /**
   * Análise completa de dominó: segmentação, divisão e contagem de pontos.
   * Implementa o pipeline completo seguindo a teoria de extração de características.
   */
  const handleAnaliseDomino = () => {
    if (!imagemOriginal) return;

    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      converterParaGrayscale(data);
      binarizarImagem(data, 128);

      const dadosLimpos = aplicarAbertura(data, width, height);
      // Atualiza os dados originais com o resultado da limpeza
      for (let i = 0; i < data.length; i++) {
        data[i] = dadosLimpos[i];
      }

      const linhaDivisoria = detectarLinhaDivisoria(height);

      // Passo 4: Segmentação e rotulação por regiões
      const dadosSuperior = new Uint8ClampedArray(data.length);
      const dadosInferior = new Uint8ClampedArray(data.length);

      const margemLinhaDivisoria = 3;

      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const idx = (y * width + x) * 4;

          if (y < linhaDivisoria - margemLinhaDivisoria) {
            // Região superior (bem acima da linha divisória)
            dadosSuperior[idx] = data[idx];
            dadosSuperior[idx + 1] = data[idx + 1];
            dadosSuperior[idx + 2] = data[idx + 2];
            dadosSuperior[idx + 3] = data[idx + 3];
            // Limpa região inferior nos dados superior
            dadosInferior[idx] = 255;
            dadosInferior[idx + 1] = 255;
            dadosInferior[idx + 2] = 255;
            dadosInferior[idx + 3] = 255;
          } else if (y > linhaDivisoria + margemLinhaDivisoria) {
            // Região inferior (bem abaixo da linha divisória)
            dadosInferior[idx] = data[idx];
            dadosInferior[idx + 1] = data[idx + 1];
            dadosInferior[idx + 2] = data[idx + 2];
            dadosInferior[idx + 3] = data[idx + 3];
            // Limpa região superior nos dados inferior
            dadosSuperior[idx] = 255;
            dadosSuperior[idx + 1] = 255;
            dadosSuperior[idx + 2] = 255;
            dadosSuperior[idx + 3] = 255;
          } else {
            // Região da linha divisória - EXCLUI de ambas as contagens
            dadosSuperior[idx] = 255;
            dadosSuperior[idx + 1] = 255;
            dadosSuperior[idx + 2] = 255;
            dadosSuperior[idx + 3] = 255;

            dadosInferior[idx] = 255;
            dadosInferior[idx + 1] = 255;
            dadosInferior[idx + 2] = 255;
            dadosInferior[idx + 3] = 255;
          }
        }
      }

      // Passo 5: Rotulação e contagem de componentes
      const { labels: labelsSuperior, componentes: compSuperior } =
        rotularComponentes(dadosSuperior, width, height);
      const { labels: labelsInferior, componentes: compInferior } =
        rotularComponentes(dadosInferior, width, height);

      // Passo 6: Filtrar por área para remover ruído
      const { componentesValidos: pontosSuperior } = filtrarComponentesPorArea(
        labelsSuperior,
        compSuperior,
        20
      );
      const { componentesValidos: pontosInferiorBruto } =
        filtrarComponentesPorArea(labelsInferior, compInferior, 20);

      // Ajuste para remover a linha divisória da contagem inferior
      const pontosInferior = Math.max(0, pontosInferiorBruto - 1);

      // Passo 7: Salvar resultados
      setResultadoDomino({
        pontosSuperior,
        pontosInferior,
      });

      ctx.putImageData(imageData, 0, 0);
    });

    setAnchorElCaracteristicas(null);
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
        setResultadoDomino(null);
      };
      reader.readAsDataURL(file);
    }
    event.target.value = "";
    setAnchorElArquivo(null);
  };

  /**
   * Remove a imagem carregada e limpa todos os estados.
   */
  const handleRemoverImagem = () => {
    setImagemOriginal(null);
    setImagemTransformada(null);
    setImagemModificada(false);
    setResultadoDomino(null);
    setAnchorElArquivo(null);
  };

  /**
   * Remove apenas as alterações, restaurando a imagem original.
   */
  const handleRemoverAlteracoes = () => {
    setImagemTransformada(null);
    setImagemModificada(false);
    setResultadoDomino(null);
    setAnchorElArquivo(null);
  };

  /**
   * Salva a imagem transformada como arquivo PNG.
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
   * Translada a imagem por um offset fixo.
   */
  const handleTransladar = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.save();
      ctx.translate(50, 30);
      ctx.drawImage(img, 0, 0);
      ctx.restore();
    });
    setAnchorElTransf(null);
  };

  /**
   * Rotaciona a imagem em 90 graus.
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
   * Espelha a imagem horizontalmente.
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
   * Aumenta a imagem (zoom in) em 1.5x.
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
   * Diminui a imagem (zoom out) em 0.5x.
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
  // FILTROS E OPERAÇÕES MORFOLÓGICAS
  // ===================================================================

  /**
   * Aplica filtro de brilho na imagem.
   */
  const handleBrilho = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const brilho = 40;
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
   * Aplica filtro de contraste na imagem.
   */
  const handleContraste = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const contraste = 30;
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
   * Converte imagem para tons de cinza.
   */
  const handleGrayscale = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      converterParaGrayscale(data);
      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Detecção de bordas usando operador de Roberts.
   * Aplica gradiente diagonal em imagem grayscale.
   */
  const handleRoberts = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      converterParaGrayscale(data);

      const grayData = new Array(width * height);
      for (let i = 0; i < data.length; i += 4) {
        const idx = i / 4;
        grayData[idx] = data[i];
      }

      for (let y = 0; y < height - 1; y++) {
        for (let x = 0; x < width - 1; x++) {
          // Operadores de Roberts: Gx e Gy
          const gx =
            grayData[y * width + x] - grayData[(y + 1) * width + (x + 1)];
          const gy =
            grayData[y * width + (x + 1)] - grayData[(y + 1) * width + x];

          const magnitude = Math.sqrt(gx * gx + gy * gy);
          const pixelIndex = (y * width + x) * 4;
          const value = Math.max(0, Math.min(255, magnitude));
          data[pixelIndex] = value;
          data[pixelIndex + 1] = value;
          data[pixelIndex + 2] = value;
        }
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Filtro passa-baixa usando kernel 3x3 (filtro da média).
   */
  const handlePassaBaixa = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      const kernel = Array(9).fill(1 / 9);
      const originalData = new Uint8ClampedArray(data);

      for (let y = 1; y < height - 1; y++) {
        for (let x = 1; x < width - 1; x++) {
          for (let c = 0; c < 3; c++) {
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

  /**
   * Erosão morfológica: reduz regiões brancas aplicando o mínimo local.
   * Utiliza elemento estruturante 3x3 quadrado sobre imagem binarizada.
   */
  const handleErosao = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      converterParaGrayscale(data);
      binarizarImagem(data, 128);

      const resultado = aplicarErosao(data, width, height);

      // Atualiza os dados com o resultado
      for (let i = 0; i < data.length; i++) {
        data[i] = resultado[i];
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Dilatação morfológica: expande regiões brancas aplicando o máximo local.
   * Utiliza elemento estruturante 3x3 quadrado sobre imagem binarizada.
   */
  const handleDilatacao = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      converterParaGrayscale(data);
      binarizarImagem(data, 128);

      const resultado = aplicarDilatacao(data, width, height);

      // Atualiza os dados com o resultado
      for (let i = 0; i < data.length; i++) {
        data[i] = resultado[i];
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Abertura morfológica: erosão seguida de dilatação.
   * Remove ruídos pequenos e suaviza contornos.
   */
  const handleAbertura = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      converterParaGrayscale(data);
      binarizarImagem(data, 128);

      const resultado = aplicarAbertura(data, width, height);

      // Atualiza os dados com o resultado
      for (let i = 0; i < data.length; i++) {
        data[i] = resultado[i];
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Fechamento morfológico: dilatação seguida de erosão.
   * Preenche pequenos buracos e conecta regiões próximas.
   */
  const handleFechamento = () => {
    if (!imagemOriginal) return;
    carregarNoCanvas(imagemOriginal, (ctx, img) => {
      ctx.drawImage(img, 0, 0);
      const imageData = ctx.getImageData(0, 0, img.width, img.height);
      const data = imageData.data;
      const width = img.width;
      const height = img.height;

      converterParaGrayscale(data);
      binarizarImagem(data, 128);

      const resultado = aplicarFechamento(data, width, height);

      // Atualiza os dados com o resultado
      for (let i = 0; i < data.length; i++) {
        data[i] = resultado[i];
      }

      ctx.putImageData(imageData, 0, 0);
    });
    setAnchorElFiltros(null);
  };

  /**
   * Esqueletização usando algoritmo de Zhang-Suen.
   * Aplica afinamento iterativo em imagem binária até convergência.
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

        converterParaGrayscale(data);

        // Binarizar: preto = 1, branco = 0
        for (let i = 0; i < data.length; i += 4) {
          const v = data[i] < 128 ? 1 : 0;
          data[i] = data[i + 1] = data[i + 2] = v * 255;
        }

        // Criar matriz binária
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

        // Atualizar imageData com resultado
        for (let y = 0; y < height; y++) {
          for (let x = 0; x < width; x++) {
            const idx = (y * width + x) * 4;
            const v = bin[y][x] ? 0 : 255;
            data[idx] = data[idx + 1] = data[idx + 2] = v;
          }
        }
        ctx.putImageData(imageData, 0, 0);
      }
    );
    setAnchorElFiltros(null);
  };

  // ===================================================================
  // CONTROLES DE INTERFACE
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
            <Button
              color="inherit"
              onClick={handleMenuOpen(setAnchorElCaracteristicas)}
            >
              Extração de Características
            </Button>
            <Menu
              anchorEl={anchorElCaracteristicas}
              open={Boolean(anchorElCaracteristicas)}
              onClose={handleMenuClose(setAnchorElCaracteristicas)}
            >
              <MenuItem
                onClick={handleAnaliseDomino}
                disabled={!imagemOriginal}
              >
                Análise de Dominó
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
          <canvas ref={canvasRef} style={{ display: "none" }} />
        </Box>

        {/* Painel de Resultados da Análise de Dominó */}
        {resultadoDomino && (
          <Box
            sx={{
              mt: 3,
              p: 2,
              display: "flex",
              justifyContent: "center",
              gap: 4,
            }}
          >
            <Typography
              variant="h6"
              sx={{ color: "#1976d2", fontWeight: "bold" }}
            >
              Resultado da Análise de Dominó
            </Typography>
            <Box sx={{ display: "flex", gap: 4, alignItems: "center" }}>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Parte Superior
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ color: "#d32f2f", fontWeight: "bold" }}
                >
                  {resultadoDomino.pontosSuperior}
                </Typography>
                <Typography variant="caption">pontos</Typography>
              </Box>
              <Typography variant="h3" sx={{ color: "#666" }}>
                |
              </Typography>
              <Box sx={{ textAlign: "center" }}>
                <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
                  Parte Inferior
                </Typography>
                <Typography
                  variant="h4"
                  sx={{ color: "#d32f2f", fontWeight: "bold" }}
                >
                  {resultadoDomino.pontosInferior}
                </Typography>
                <Typography variant="caption">pontos</Typography>
              </Box>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}

export default App;
