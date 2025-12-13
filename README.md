# 🍳 Chef Assist - Asistente de Cocina Inteligente

Asistente de cocina especializado con IA que genera recetas adaptadas a intolerancias alimentarias y restricciones dietéticas. Potenciado por modelos de Hugging Face, proporciona recetas estructuradas en Markdown con ingredientes, pasos detallados, tiempos y sustituciones.

## ✨ Características

### 🎯 Especialización Culinaria
- **Dominio exclusivo**: Responde únicamente sobre cocina, recetas y técnicas culinarias
- **Filtro inteligente**: Rechaza consultas fuera del ámbito gastronómico

### 🥗 Adaptaciones Dietéticas Multi-Selección
- Sin gluten
- Vegana
- Sin lactosa
- Sin nueces
- Baja en FODMAP

### 📝 Respuestas Estructuradas
Cada receta incluye:
- **Título** con raciones y tiempo total
- **Lista de ingredientes** con cantidades precisas y sustitutos por dieta
- **Preparación paso a paso** con tiempos y temperaturas
- **Mise en place** cuando aplique
- **Nota de alérgenos** y sustituciones clave
- **Variantes** (hasta 2) para diversificar

### ⚡ Estilos de Receta
- **Breve**: Formato rápido y conciso, sin emojis decorativos
- **Clásica**: Balance ideal con formato estándar y estructura clara
- **Elaborada**: Máximo detalle con técnicas avanzadas y tiempos precisos

### 🎨 UI/UX Profesional
- Diseño oscuro con gradientes (slate-950 → slate-900)
- Burbujas de chat diferenciadas (usuario: indigo / asistente: slate-900)
- Scroll personalizado (delgado y oscuro)
- Botón de copia en respuestas del asistente
- Chips de selección rápida y variantes
- Auto-scroll al recibir mensajes
- Layout full-viewport sin scroll exterior

### 🔧 Funcionalidades Avanzadas
- **Checkbox "2 variantes completas"**: Solicita 2 recetas completas con toda la estructura (ingredientes, pasos, alérgenos) para cada una
- **Renderizado Markdown**: Respuestas formateadas con `react-markdown`
- **Sin límite de tokens restrictivo**: 2000 tokens para garantizar recetas completas sin cortes

## 🛠️ Stack Tecnológico

- **Framework**: [Next.js 16](https://nextjs.org) (App Router)
- **UI**: React 19.2 + TypeScript
- **Estilos**: Tailwind CSS 4
- **Markdown**: react-markdown 9
- **IA**: Hugging Face Router (modelo por defecto: Llama-3.2-3B-Instruct)
- **Gestión de estado**: React Hooks (useState, useEffect, useRef)

## 🚀 Instalación y Configuración

### 1. Clonar el repositorio
```bash
git clone https://github.com/tu-usuario/my-ai-chat.git
cd my-ai-chat
```

### 2. Instalar dependencias
```bash
npm install
```

### 3. Configurar variables de entorno
Crea un archivo `.env.local` basándote en `.env.example`:

```bash
cp .env.example .env.local
```

**Variables necesarias:**
- `HF_TOKEN` o `HUGGINGFACE_API_KEY`: Token de Hugging Face ([obtener aquí](https://huggingface.co/settings/tokens))
- `HUGGINGFACE_MODEL` (opcional): Modelo a usar (default: `meta-llama/Llama-3.2-3B-Instruct`)
- `SYSTEM_PROMPT` (opcional): Prompt del sistema para personalizar el comportamiento

### 4. Ejecutar en desarrollo
```bash
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

### 5. Build para producción
```bash
npm run build
npm start
```

## 📁 Estructura del Proyecto

```
my-ai-chat/
├── app/
│   ├── api/
│   │   └── chat/
│   │       └── route.ts          # API endpoint que conecta con HF
│   ├── components/
│   │   └── ChatHF.tsx            # Componente principal del chat
│   ├── globals.css               # Estilos globales + scrollbar
│   ├── layout.tsx                # Layout raíz
│   └── page.tsx                  # Página principal
├── .env.example                  # Plantilla de variables de entorno
├── package.json
└── README.md
```

## 🎨 Personalización

### Añadir más opciones dietéticas
Edita el array en `ChatHF.tsx`:
```tsx
["Sin gluten", "Vegana", "Sin lactosa", "Sin nueces", "Baja en FODMAP", "Tu nueva opción"]
```

### Cambiar estilos de receta
Modifica el objeto `presets` en `ChatHF.tsx`:
```tsx
const presets = {
  breve: { style: "rápida y concisa", label: "Receta breve" },
  clasica: { style: "estándar", label: "Receta clásica" },
  elaborada: { style: "elaborada y detallada", label: "Receta elaborada" },
};
```

### Ajustar el prompt del sistema
Edita `SYSTEM_PROMPT` en `.env.local` para cambiar el comportamiento del asistente.

## 📝 Uso

1. **Selecciona dietas** (multi-selección): Haz clic en los chips para activar/desactivar
2. **Marca "Dame 2 variantes completas"** si quieres 2 recetas diferentes
3. **Elige estilo**: Breve (rápido), clásica (estándar) o elaborada (detallado)
4. **Usa filtros rápidos**: "Cena rápida sin gluten", "Idea vegana proteica", etc.
5. **Añade variantes**: "Incluye alternativa sin nueces", "Versión para niños", etc.
6. **Escribe tu consulta** y pulsa Enter o "Enviar"
7. **Copia la receta**: Botón "Copiar" en cada respuesta del asistente

## 🐛 Solución de Problemas

### Error: "No HF_TOKEN o HUGGINGFACE_API_KEY"
Asegúrate de crear `.env.local` con tu token de Hugging Face.

### El modelo no responde / tarda mucho
Algunos modelos pueden estar sobrecargados. Prueba con `meta-llama/Llama-3.2-1B-Instruct` (más rápido) o consulta el [estado de HF](https://status.huggingface.co/).

### Respuestas cortadas
El sistema usa 2000 tokens para evitar cortes. Si persiste, verifica que el `SYSTEM_PROMPT` no sea excesivamente largo o prueba con estilo "breve" que prioriza concisión.

## 🚀 Deploy en Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/tu-usuario/my-ai-chat)

1. Haz clic en el botón de deploy
2. Conecta tu repositorio de GitHub
3. Añade las variables de entorno en Vercel:
   - `HF_TOKEN` o `HUGGINGFACE_API_KEY`
   - `SYSTEM_PROMPT` (opcional)
4. Deploy automático

## 📄 Licencia

MIT

## 🤝 Contribuciones

Las contribuciones son bienvenidas. Por favor:
1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📧 Contacto

Tu Nombre - [tu-email@example.com](mailto:tu-email@example.com)

Proyecto: [https://github.com/tu-usuario/my-ai-chat](https://github.com/tu-usuario/my-ai-chat)

---

**Hecho con ❤️ usando Next.js y Hugging Face**
