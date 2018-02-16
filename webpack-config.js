'use strict';
//  Summary:
//    Get webpack config for different targets

const path = require('path');
const _ = require('lodash');
const webpack = require('webpack');
const LodashModuleReplacementPlugin = require('lodash-webpack-plugin');

const pkgJson = require('./package.json');

const BundleTracker = require('webpack-bundle-tracker');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const autoprefixer = require('autoprefixer');
const HtmlWebpackPlugin = require("html-webpack-plugin");

module.exports = (type) => {
  // eslint-disable-line
  // type is one of [dev, dll, test, dist]
  // NOTE: for test, only module property is used.

  const isDev = type === 'dev';
  const isDist = type === 'dist';

  return {
    devtool: {
      dev: 'eval',
      dll: false,
      test: false,
      dist: false,
    }[type],
    cache: true,
    context: path.join(__dirname, 'src'),
    entry: {
      dev: {
        index: [
          'react-hot-loader/patch',
          `webpack-hot-middleware/client?http://0.0.0.0:${pkgJson.rekit.devPort}`,
          './styles/index.scss',
          './index',
        ],
      },
      dll: {
        // Here dll is only used for dev.
        'dev-vendors': [
          'react-hot-loader',
          'react-proxy',
          'babel-polyfill',
          'lodash',
          'react',
          'react-dom',
          'react-router',
          'react-redux',
          'react-router-redux',
          'redux',
          'redux-logger',
          'redux-thunk',
        ],
      },
      dist: {
        index: [
          'babel-polyfill',
          './styles/index.scss',
          './index'
        ],
      },
      test: null,
    }[type],

    output: {
      // Js bundle name, [name] will be replaced by which is in entry
      filename: 'js/[name].js',

      // Where to save your build result
      path: path.join(__dirname, './build/'),

      // Exposed asset path. NOTE: the end '/' is necessary
      publicPath: '/'
    },

    plugins: _.compact([
        isDev && new webpack.HotModuleReplacementPlugin(),
        new webpack.NoEmitOnErrorsPlugin(),
        isDist && new LodashModuleReplacementPlugin(),
        isDist && new webpack.LoaderOptionsPlugin({
            minimize: true,
            debug: false,
            options: {
                postcss: [
                    autoprefixer({
                        browsers: [
                            'last 3 version',
                            'ie >= 10',
                        ],
                    }),
                ],
                context: path.join(__dirname, './src/'),
            },
        }),
        isDist && new webpack.optimize.UglifyJsPlugin({
            minimize: true,
            compress: {
                warnings: false,
                screw_ie8: true,
                conditionals: true,
                unused: true,
                comparisons: true,
                sequences: true,
                dead_code: true,
                evaluate: true,
                if_return: true,
                join_vars: true,
            },
            output: {
                comments: false,
            },
        }),
        new ExtractTextPlugin({
            allChunks: true,
            filename: 'css/[name].[hash:8].min.css'
        }),
        isDist && new BundleTracker({ filename: './build/webpack-stats.json' }),
        isDist && new webpack.optimize.ModuleConcatenationPlugin(),
        isDist && new webpack.optimize.OccurrenceOrderPlugin(),
        isDist && new webpack.optimize.AggressiveMergingPlugin(),
        isDist && new webpack.optimize.CommonsChunkPlugin({
            name: 'library',
            filename: 'js/library.[hash:8].js',
            minChunks(module, count) {
                return module.context && module.context.indexOf('node_modules') >= 0;
            },
        }),
        new HtmlWebpackPlugin({
            template: path.join(__dirname, "./src/index.html"),
            path: "./build/",
            filename: "index.html",
            favicon: "favicon.png",
            script: isDist ? "" : "<script src='/.tmp/dev-vendors.js'></script>"
        }),
        new webpack.DefinePlugin({
            'process.env': {
                NODE_ENV: JSON.stringify(type === 'dist' ? 'production' : type),
            }
        })
    ]),

    module: {
      rules: [
          {
              test: /\.(js|jsx)$/,
              exclude: /node_modules|build/,
              use: [{
                  loader: 'babel-loader',
                  options: {
                      compact: true,
                      cacheDirectory: true,
                      plugins: [
                          'transform-runtime',
                          'transform-decorators-legacy',
                          'transform-class-properties',
                          'lodash'
                      ],
                      presets: [
                          'react',
                          'stage-0',
                          ['env', { targets: { node: 4 } }]
                      ]
                  }
              }],

          },{
              test: /\.(ttf|eot|svg|woff)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
              loader: 'file-loader'
          }, {
              test: /\.scss$/,
              exclude: /node_modules/,
              loader: isDev ? ExtractTextPlugin.extract({
                  fallback: 'style-loader',
                  use: [
                      {
                          loader: 'css-loader',
                          options: {
                              url: false,
                              minimize: false,
                              sourceMap: true
                          }
                      },
                      { loader: 'sass-loader?sourceMap' }
                  ],

              }) : ExtractTextPlugin.extract({
                  fallback: 'style-loader',
                  use: [
                      {
                          loader: 'css-loader',
                          options: {
                              url: false,
                              minimize: true
                          }
                      },
                      { loader: 'sass-loader' }
                  ],

              })

          }, {
              test: /\.css$/,
              exclude: /node_modules/,
              loader: ExtractTextPlugin.extract({
                  fallback: 'style-loader',
                  use: [
                      {
                          loader: 'css-loader',
                          query: { modules: false },
                      },
                      { loader: 'postcss-loader' }
                  ]
              }),
          }, {
              test: /\.json$/,
              loader: 'json-loader'
          }, {
              test: /\.(png|gif|jpe?g|svg)$/,
              use: 'file-loader?name=[path][name].[ext]',
          }, {
              test: /\.(eot|ttf|woff|woff2)$/,
              loader: 'file-loader?hash=sha512&name=[path][hash].[ext]'
          }
      ]
    }
  };
};
