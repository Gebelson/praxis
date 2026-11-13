/**
 * PRAXIS — Configuração dos Avatares do Bloco de Confiança (Seção 2)
 *
 * Estrutura de dados modular que permite substituir, adicionar ou reordenar
 * cada avatar individualmente sem afetar a integridade do layout.
 *
 * Propriedades:
 * - id: Identificador único do avatar
 * - name: Nome da pessoa / cliente
 * - image: Caminho do arquivo de imagem (PNG, JPG, WebP)
 * - alt: Texto alternativo para acessibilidade
 * - objectPosition: Posição focal (padronizado em 'center center')
 * - objectFit: Ajuste visual (padronizado em 'cover')
 */
export const trustAvatars = [
  {
    id: 'avatar-1',
    name: 'Cliente 1',
    image: '/assets/client-portraits/portrait-01.jpg',
    alt: 'Retrato ilustrativo',
    objectPosition: 'center center',
    objectFit: 'cover'
  },
  {
    id: 'avatar-2',
    name: 'Cliente 2',
    image: '/assets/client-portraits/portrait-02.jpg',
    alt: 'Retrato ilustrativo',
    objectPosition: 'center center',
    objectFit: 'cover'
  },
  {
    id: 'avatar-3',
    name: 'Cliente 3',
    image: '/assets/client-portraits/portrait-03.jpg',
    alt: 'Retrato ilustrativo',
    objectPosition: 'center center',
    objectFit: 'cover'
  },
  {
    id: 'avatar-4',
    name: 'Cliente 4',
    image: '/assets/client-portraits/portrait-04.jpg',
    alt: 'Retrato ilustrativo',
    objectPosition: 'center center',
    objectFit: 'cover'
  },
  {
    id: 'avatar-5',
    name: 'Cliente 5',
    image: '/assets/client-portraits/portrait-05.jpg',
    alt: 'Retrato ilustrativo',
    objectPosition: 'center center',
    objectFit: 'cover'
  },
  {
    id: 'avatar-6',
    name: 'Cliente 6',
    image: '/assets/client-portraits/portrait-06.jpg',
    alt: 'Retrato ilustrativo',
    objectPosition: 'center center',
    objectFit: 'cover'
  },
  {
    id: 'avatar-7',
    name: 'Cliente 7',
    image: '/assets/client-portraits/portrait-07.jpg',
    alt: 'Retrato ilustrativo',
    objectPosition: 'center center',
    objectFit: 'cover'
  }
];
