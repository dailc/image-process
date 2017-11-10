/**
 * 构建一个矩阵对象，便于矩阵操作
 */

import {
    extend,
} from '../util/lang';

const defaultetting = {
    data: [],
    rows: 0,
    cols: 0,
    desc: '',
};

class Matrix {
    /**
     * 构造一个矩阵，未赋值的初始数据默认是0
     * @param {Object} options 配置信息，分别有
     * data 实际的数据，是一个一维或二维数组(根据这个读取方式不一样)
     * rows 矩阵的行
     * cols 矩阵的列
     * desc 字符串形式的描述，譬如3x4（代表3行4列），优先级更高，当其合法时会覆盖rows和cols
     * @constructor
     */
    constructor(options) {
        this.options = extend({}, defaultetting, options);

        const reg = /^\s*(\d+)\s*[*]\s*(\d+)\s*$/;
        const matchBody = this.options.match(reg);

        this.rows = matchBody[1] || this.options.rows;
        this.cols = matchBody[2] || this.options.cols;

        const inputData = this.options.data;
        const resData = [];
        const rows = this.rows;
        const cols = this.cols;

        if (inputData[0] && inputData[0][0] !== undefined) {
            // 如果输入数组是二维的
            for (let row = 0; row < rows; row += 1) {
                resData[row] = [];
                for (let col = 0; col < cols; col += 1) {
                    resData[row][col] = inputData[row][col] || 0;
                }
            }
        } else {
            // 如果输入是一维的
            for (let row = 0; row < rows; row += 1) {
                resData[row] = [];
                for (let col = 0; col < cols; col += 1) {
                    const index = row * cols + col;

                    resData[row][col] = inputData[index] || 0;
                }
            }
        }

        this.data = resData;
    }
    
    transpose() {
        // 求矩阵的转置B的(i,j)等于A的(j,i)
        const rows = this.cols;
        const cols = this.rows;
        const resMatrix = new Matrix({
            data: [],
            rows,
            cols,
        });

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                resMatrix.data[row][col] = this.data[col][row];
            }
        }
        
        return resMatrix;
    }
    
    inverse() {
        // TODO: 后续补上，但事实上是不建议直接求逆的
        // 求逆，需要是可逆矩阵才能求
        if (this.cols !== this.rows) {
            // 只有方阵才能求逆
            throw new Error('非方阵不能求逆');
        }
        // 非奇异矩阵才能求逆
    }

    plus(matrix) {
        if (this.rows !== matrix.rows ||
            this.cols !== matrix.cols) {
            throw new Error('矩阵加法行列不匹配');
        }
        
        const rows = this.rows;
        const cols = this.cols;
        const resMatrix = new Matrix({
            data: [],
            rows,
            cols,
        });

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                resMatrix.data[row][col] = this.data[row][col] + matrix.data[row][col];
            }
        }
        
        return resMatrix;
    }
    
    minus(matrix) {
        if (this.rows !== matrix.rows ||
            this.cols !== matrix.cols) {
            throw new Error('矩阵减法行列不匹配');
        }

        const rows = this.rows;
        const cols = this.cols;
        const resMatrix = new Matrix({
            data: [],
            rows,
            cols,
        });

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                resMatrix.data[row][col] = this.data[row][col] - matrix.data[row][col];
            }
        }
        
        return resMatrix;
    }
    
    multipy(matrix) {
        // 注意矩阵的乘法的行与列匹配
        if (this.cols !== matrix.rows) {
            throw new Error('矩阵乘法行列不匹配');
        }
        
        const rows = this.rows;
        const cols = matrix.cols;
        const resMatrix = new Matrix({
            data: [],
            rows,
            cols,
        });

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                let sum = 0;
                
                // A的第x行和B的第x列的每一个元素一一对于的乘，然后求和
                for (let index = 0; index < cols; index += 1) {
                    sum += this.data[row][index] * matrix.data[index][col];
                }
                resMatrix.data[row][col] = sum;
            }
        }
        
        return resMatrix;
    }

    destroy() {
        this.data = null;
        this.options = null;
        this.rows = null;
        this.cols = null;
    }
}

export default Matrix;