const path = require('path');
const {
  HtmlPlugin,
  CleanPlugin,
  ProgressPlugin,
  DefinePlugin,
  BannerPlugin
} = require('../src/plugins');

module.exports = {
  mode: 'development',
  
  entry: {
    main: './src/index.js',
    vendor: './src/vendor.js'
  },
  
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[hash:8].js',
    publicPath: '/'
  },
  
  resolve: {
    extensions: ['.js', '.json', '.css'],
    alias: {
      '@': path.resolve(__dirname, 'src'),
      'utils': path.resolve(__dirname, 'src/utils')
    }
  },
  
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'babel',
            options: {
              presets: ['@babel/preset-env']
            }
          }
        ]
      },
      {
        test: /\.css$/,
        use: ['style', 'css']
      },
      {
        test: /\.json$/,
        use: ['json']
      },
      {
        test: /\.(png|jpg|gif|svg)$/,
        use: [
          {
            loader: 'file',
            options: {
              name: 'images/[name].[hash:8].[ext]'
            }
          }
        ]
      }
    ]
  },
  
  plugins: [
    new CleanPlugin(),
    
    new ProgressPlugin(),
    
    new DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development'),
      '__VERSION__': JSON.stringify('1.0.0'),
      '__API_URL__': JSON.stringify('http://localhost:3000/api')
    }),
    
    new HtmlPlugin({
      title: 'Mini Webpack 示例',
      template: './public/index.html',
      filename: 'index.html'
    }),
    
    new BannerPlugin({
      banner: `Mini Webpack Example\nBuild time: ${new Date().toLocaleString()}`,
      test: /\.js$/
    })
  ],
  
  optimization: {
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        },
        common: {
          name: 'common',
          minChunks: 2,
          chunks: 'all',
          enforce: true
        }
      }
    }
  },
  
  devServer: {
    port: 8080,
    host: 'localhost',
    hot: true,
    open: true,
    static: {
      directory: path.resolve(__dirname, 'dist')
    }
  },
  
  devtool: 'source-map',
  
  stats: {
    colors: true,
    modules: false,
    children: false,
    chunks: true,
    chunkModules: false
  }
};