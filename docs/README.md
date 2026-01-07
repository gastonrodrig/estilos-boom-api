# Documentación de Level Music API

Bienvenido a la documentación oficial de Level Music API. Este directorio contiene toda la documentación técnica del proyecto.

## Estructura de la Documentación

- [**Modelo de Datos**](./model/): Documentación del modelo de datos y diagrama ER usando PlantUML
  - [Diagrama ER](./model/levelmusic.puml): Modelo entidad-relación completo del sistema
  - [Descripción detallada](./model/README.md): Explicación de las entidades, atributos y relaciones

## Contribuciones a la Documentación

Para contribuir a la documentación, siga estas pautas:

1. Para el modelo de datos, actualice el archivo `model/levelmusic.puml` usando la sintaxis de PlantUML.
2. Para las integraciones, actualice los archivos Markdown correspondientes.

## Generación de Diagramas

Para generar imágenes a partir del archivo PlantUML:

```bash
plantuml docs/model/levelmusic.puml
```

O utilice alguna extensión de PlantUML para VS Code u otro editor compatible.