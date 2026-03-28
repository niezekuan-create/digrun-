import dev from './dev'
import prod from './prod'

declare const process: any

const config = {
  projectName: 'digrun-miniprogram',
  date: '2024-03-21',
  designWidth: 750,
  deviceRatio: {
    640: 2.34 / 2,
    750: 1,
    828: 1.81 / 2,
  },
  sourceRoot: 'src',
  outputRoot: 'dist',
  plugins: [],
  defineConstants: {},
  copy: {
    patterns: [],
    options: {},
  },
  framework: 'react',
  compiler: 'webpack5',
  cache: {
    enable: true,
  },
  mini: {
    postcss: {
      pxtransform: {
        enable: true,
        config: {},
      },
      url: {
        enable: true,
        config: {
          limit: 1024,
        },
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
  h5: {
    publicPath: '/',
    staticDirectory: 'static',
    postcss: {
      autoprefixer: {
        enable: true,
        config: {},
      },
      cssModules: {
        enable: false,
        config: {
          namingPattern: 'module',
          generateScopedName: '[name]__[local]___[hash:base64:5]',
        },
      },
    },
  },
}

export default function (merge: any) {
  const cfg = String(process?.env?.TARO_APP_CONFIG || '').trim().toLowerCase()
  if (cfg === 'dev') {
    return merge({}, config, dev)
  }
  if (cfg === 'prod') {
    return merge({}, config, prod)
  }
  if (process.env.NODE_ENV === 'development') {
    return merge({}, config, dev)
  }
  return merge({}, config, prod)
}
