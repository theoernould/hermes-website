import { resolve } from 'path';

export const entry = './src/index.js';
export const output = {
	path: resolve(__dirname, './public'),
	filename: './js/index.js',
};
export const target = ['web', 'es5'];
export const module = {
	rules: [
		{
			test: /\.js$/,
			exclude: /node_modules/,
			use: {
				// ... seront compilés par babel !
				loader: 'babel-loader',
			},
		},
	],
};
export const devtool = 'eval-cheap-module-source-map';
