/**
 * Utility functions for generating placeholder images locally
 */

/**
 * Generates a placeholder image with text using Canvas API
 * @param text The text to display on the placeholder
 * @param width The width of the image
 * @param height The height of the image
 * @param backgroundColor The background color (hex)
 * @param textColor The text color (hex)
 * @returns Data URL of the generated image
 */
export const generatePlaceholderImage = (
  text: string,
  width: number = 400,
  height: number = 500,
  backgroundColor: string = '#64748b', // slate-500
  textColor: string = '#f8fafc' // slate-50
): string => {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    // Fallback: return a simple data URL
    return 'data:image/svg+xml;base64,' + btoa(`
      <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
        <rect width="100%" height="100%" fill="${backgroundColor}"/>
        <text x="50%" y="50%" font-family="system-ui, sans-serif" font-size="14" fill="${textColor}" text-anchor="middle" dominant-baseline="central">
          ${text}
        </text>
      </svg>
    `);
  }

  canvas.width = width;
  canvas.height = height;

  // Fill background
  ctx.fillStyle = backgroundColor;
  ctx.fillRect(0, 0, width, height);

  // Set text properties
  ctx.fillStyle = textColor;
  ctx.font = 'bold 16px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  // Word wrap function
  const wrapText = (text: string, maxWidth: number) => {
    const words = text.split(' ');
    const lines = [];
    let currentLine = words[0];

    for (let i = 1; i < words.length; i++) {
      const word = words[i];
      const width = ctx.measureText(currentLine + ' ' + word).width;
      if (width < maxWidth) {
        currentLine += ' ' + word;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }
    lines.push(currentLine);
    return lines;
  };

  // Draw text with word wrapping
  const maxTextWidth = width - 40; // 20px padding on each side
  const lines = wrapText(text, maxTextWidth);
  const lineHeight = 24;
  const startY = height / 2 - ((lines.length - 1) * lineHeight) / 2;

  lines.forEach((line, index) => {
    ctx.fillText(line, width / 2, startY + index * lineHeight);
  });

  // Add a subtle border
  ctx.strokeStyle = '#94a3b8'; // slate-400
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, width - 2, height - 2);

  return canvas.toDataURL('image/png');
};

/**
 * Generates a placeholder image for a product category
 * @param category The product category
 * @param productName The product name
 * @returns Data URL of the generated placeholder image
 */
export const generateProductPlaceholder = (category: string, productName: string): string => {
  const categoryColors: { [key: string]: { bg: string; text: string } } = {
    '상의': { bg: '#ef4444', text: '#ffffff' }, // red
    '하의': { bg: '#3b82f6', text: '#ffffff' }, // blue
    '신발': { bg: '#059669', text: '#ffffff' }, // green
    '악세서리': { bg: '#d97706', text: '#ffffff' }, // amber
  };

  const colors = categoryColors[category] || { bg: '#64748b', text: '#f8fafc' };

  return generatePlaceholderImage(
    `${category}\n${productName}`,
    400,
    500,
    colors.bg,
    colors.text
  );
};

/**
 * Generates a simple colored placeholder
 * @param width Image width
 * @param height Image height
 * @param color Background color
 * @returns Data URL of the generated image
 */
export const generateColorPlaceholder = (
  width: number = 400,
  height: number = 500,
  color: string = '#64748b'
): string => {
  return `data:image/svg+xml;base64,${btoa(`
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <circle cx="50%" cy="50%" r="30" fill="rgba(255,255,255,0.1)"/>
    </svg>
  `)}`;
};