# Cómo ejecutar archivos .puml en Visual Studio Code (Windows & Mac)

Este documento explica cómo visualizar y generar diagramas a partir de archivos `.puml` en **Visual Studio Code** usando la extensión **PlantUML** en **Windows y Mac**.

## Instalación de requisitos

1. **Instalar la extensión de PlantUML**:  
   - Abre VS Code.
   - Ve a la pestaña **Extensiones** (`Ctrl+Shift+X`).
   - Busca `PlantUML` e instálala.

2. **Instalar Graphviz** (necesario para generar diagramas):  
   - Descarga e instala Graphviz desde: [Graphviz Download](https://graphviz.gitlab.io/download/)
   - Asegúrate de que el ejecutable `dot` esté en el **PATH** del sistema.
     - **Windows**: Agrega la ruta de `dot.exe` en las variables de entorno.
     - **Mac**: Si usas Homebrew, instala Graphviz con `brew install graphviz`.

## Cómo visualizar un diagrama PlantUML

1. Abre un archivo `.puml` en VS Code.
2. Usa el atajo `Alt + D` (Windows/Linux) o `⌥ + D` (Mac) para previsualizar el diagrama.
3. También puedes hacer clic derecho en el archivo y seleccionar **"Preview Current Diagram"**.

## Exportar diagramas a imagen
Para exportar a PNG, SVG o PDF:
- Abre la paleta de comandos (`Ctrl+Shift+P` / `⌘+Shift+P` en Mac).
- Busca `PlantUML: Export Current Diagram` y selecciona el formato deseado.

¡Listo! Ahora puedes trabajar con **PlantUML** en **VS Code** sin problemas.