const path = require('path');
const webpack = require('webpack');
var WebpackObfuscator = require('webpack-obfuscator');

module.exports = {
    mode: 'none',
    entry: {
        app: path.join(__dirname, './src', 'index.tsx')
    },
    target: 'web',
    resolve: {
        extensions: ['.ts', '.tsx', '.js']
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: '/node_modules/'
            },
            {
                test: /\.css$/i,
                use: ["style-loader", "css-loader"]
            },
            {
                test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
                type: "asset"
            }
        ]
    },
    output: {
        filename: 'smartui-mcp-crm.js',
        path: path.resolve(__dirname, '../lib')
    },
    optimization: {
        minimize: true
    },
    plugins: [
        new webpack.DefinePlugin({ 'process.env.NODE_ENV': JSON.stringify('production') }),
        new WebpackObfuscator({ rotateStringArray: true })
    ]
};
