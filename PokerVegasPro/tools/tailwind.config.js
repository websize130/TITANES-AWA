/* Igual que la configuración en línea de index.html. Se usa para compilar Tailwind en la versión de un solo archivo. */
module.exports = {
  content: [__dirname + '/../index.html', __dirname + '/../admin.html', __dirname + '/../js/**/*.js'],
  theme: {
    extend: {
      fontFamily: { display: ['Oswald', 'sans-serif'], script: ['"Great Vibes"', 'cursive'], body: ['Inter', 'sans-serif'] },
      colors: { gold: { 300: '#ffe08a', 400: '#f3c560', 500: '#e8b54a', 600: '#b98a2a' }, ink: { 900: '#07040a', 800: '#0f0a12', 700: '#17111b' } },
    },
  },
};
