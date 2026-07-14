/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  allowedDevOrigins: ['192.168.124.1', '192.168.1.80'],
}

export default nextConfig

//na maquina que estiver a correr o projeto, verificar o endereço IP dela e adicionar no allowedDevOrigins para que seja possivel aceder outras maquinas na mesma rede local.
//para outras maquinas acederem devem de estar na mesma rede local 192.168.1.80:3000