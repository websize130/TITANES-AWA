// Configuración de despliegue. Sustituye el ID de editor y los slots por los de tu cuenta de AdSense.
// Mientras el client contenga "XXXX" no se carga el script de AdSense y se muestran huecos de ejemplo.
export const CONFIG = {
  adsense: {
    client: 'ca-pub-XXXXXXXXXXXXXXXX',
    slots: {
      main: '1111111111',
      map: '2222222222',
      armory: '3333333333',
      summary: '4444444444',
    },
  },
  saveKey: 'dustblood.save.v1',
};

export const adsenseConfigured = () => !/X{4}/.test(CONFIG.adsense.client);
