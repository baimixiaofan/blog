---
title: "numpy"
summary: "飞书云文档 · 同步于 2026-07-27"
date: 2026-07-27
url: https://feishu.cn/wiki/QjJBwyTY2iu5ryktwpycPb8ZnSf
---

numpy
NumPy 迭代数组
迭代数组说着很好听其实就是遍历数组就像for i i>0 i++{arr[i]}一样
使用一次nditer内部自动加1，
主要函数：
for x in np.nditer(a):
    print (x, end=", " )
就可以这样遍历全部元素。
Numpy 数组操作
reshape
reshape的格式：numpy.reshape(arr, newshape, order='C')
reshape:reshape 按照指定的 order 参数，以某种顺序遍历原数组的元素，然后按同样的顺序填入新形状。默认的 C 顺序就是“行优先”，而 Fortran 顺序是“列优先”。
numpy.ndarray.flat
返回迭代器，就是数组后面加.flat例如arr.flat
示例：
for element in a.flat:
    print (element)
numpy.ndarray.flatten
用法还是数组后面加入.flatten，例如arr.flatten
返回一个数组
示例：
print (a.flatten())
print ('\n')
numpy.ravel
也是返回一维数组但是是在原基础上修改
示例：
print (a.ravel())
print ('\n')

  
numpy.transpose
功能：numpy.transpose 函数用于对换数组的维度，常用于求数组（矩阵）的转置
会返回一个数组。
使用实例：print (np.transpose(a))
numpy.ndarray.T
numpy.ndarray.T 类似 numpy.transpose作用几乎都是求转置矩阵，只不过transpose可以直接用arr.T
示例：
print ('转置数组：')
print (a.T)


