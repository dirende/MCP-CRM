const path = require('path');

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
                use: ["style-loader", "css-loader"],
              },
              {
                test: /\.(png|jpe?g|gif|svg|eot|ttf|woff|woff2)$/i,
                // More information here https://webpack.js.org/guides/asset-modules/
                type: "asset",
              },
        ],
    },
    output: {
        filename: 'smartui-embedcustomurl.js',
        path: path.resolve(__dirname, './dist')
    },
    optimization: {       
        minimize: false
      }
}