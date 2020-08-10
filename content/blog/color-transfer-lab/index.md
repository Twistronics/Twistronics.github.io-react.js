---
title: "Color Transfer 实验"
date: "2016-04-07T13:15:30Z"
description: "Color Transfer 是基于一阶统计特性的颜色迁移，可以将参考图像的颜色传输到目标图像。"
tags: 
  - "Python"
  - "Digital image processing"
  - "Algorithm"
---

Color Transfer 是基于一阶统计特性的颜色迁移，可以将参考图像的颜色传输到目标图像。

只利用opencv的图片读取和写入操作

首先将图片从rgb转换到Lαβ色彩空间

```python
def rgb2lab(img):
    def f(t):
        return t ** (1.0/3) if t > 0.008856 else 7.787 * t + 16.0 / 116.0

    ref_X =  95.047
    ref_Y = 100.000
    ref_Z = 108.883

    print 'start rgb2lab'

    res = np.zeros(img.shape)

    for i in range(img.shape[0]):
        for j in range(img.shape[1]):
            (B, G, R) = img[i, j]

            var_R = R / 255.0

            var_G = G / 255.0
            var_B = B / 255.0

            if var_R > 0.04045:
                var_R = ( ( var_R + 0.055 ) / 1.055 ) ** 2.4
            else:
                var_R = var_R / 12.92

            if var_G > 0.04045:
                var_G = ( ( var_G + 0.055 ) / 1.055 ) ** 2.4
            else:
                var_G = var_G / 12.92

            if var_B > 0.04045:
                var_B = ( ( var_B + 0.055 ) / 1.055 ) ** 2.4
            else:
                var_B = var_B / 12.92

            var_R = var_R * 100
            var_G = var_G * 100
            var_B = var_B * 100

            X = var_R * 0.4124 + var_G * 0.3576 + var_B * 0.1805
            Y = var_R * 0.2126 + var_G * 0.7152 + var_B * 0.0722
            Z = var_R * 0.0193 + var_G * 0.1192 + var_B * 0.9505

            var_X = X / ref_X
            var_Y = Y / ref_Y
            var_Z = Z / ref_Z

            if var_X > 0.008856:
                var_X = var_X ** ( 1/3.0 )
            else:
                var_X = ( 7.787 * var_X ) + ( 16 / 116.0 )

            if var_Y > 0.008856:
                var_Y = var_Y ** ( 1/3.0 )
            else:
                var_Y = ( 7.787 * var_Y ) + ( 16 / 116.0 )

            if var_Z > 0.008856:
                var_Z = var_Z ** ( 1/3.0 )
            else:
                var_Z = ( 7.787 * var_Z ) + ( 16 / 116.0 )

            L = ( 116 * var_Y ) - 16
            a = 500 * ( var_X - var_Y )
            b = 200 * ( var_Y - var_Z )

            L = 255 * L / 100.0
            a = 128 + a
            b = 128 + b

            res[i, j] = (L, a, b)

    return res


def lab2rgb(img):
    res = np.zeros(img.shape, dtype=np.uint8)
    img = img.astype('uint8')

    print 'lab2rgb start'

    for i in range(img.shape[0]):
        for j in range(img.shape[1]):
            (L, a, b) = img[i, j]

            L = 100.0 * L / 255.0
            a = a - 128
            b = b - 128

            var_Y = ( L + 16 ) / 116.0
            var_X = a / 500.0 + var_Y
            var_Z = var_Y - b / 200.0

            if var_Y ** 3 > 0.008856:
                var_Y = var_Y ** 3
            else:
                var_Y = ( var_Y - 16.0 / 116.0 ) / 7.787

            if var_X ** 3 > 0.008856:
                var_X = var_X ** 3
            else:
                var_X = ( var_X - 16.0 / 116.0 ) / 7.787

            if var_Z ** 3 > 0.008856:
                var_Z = var_Z ** 3
            else:
                var_Z = ( var_Z - 16.0 / 116.0 ) / 7.787

            var_R = var_X *  3.2406 + var_Y * (-1.5372) + var_Z * (-0.4986)
            var_G = var_X * (-0.9689) + var_Y *  1.8758 + var_Z *  0.0415
            var_B = var_X *  0.0557 + var_Y * (-0.2040) + var_Z *  1.0570

            if var_R > 0.0031308:
                var_R = 1.055 * ( var_R ** ( 1 / 2.4 ) ) - 0.055
            else:
                var_R = 12.92 * var_R

            if var_G > 0.0031308:
                var_G = 1.055 * ( var_G ** ( 1 / 2.4 ) ) - 0.055
            else:
                var_G = 12.92 * var_G

            if var_B > 0.0031308:
                var_B = 1.055 * ( var_B ** ( 1 / 2.4 ) ) - 0.055
            else:
                var_B = 12.92 * var_B

            R = np.uint8(max(var_R * 255, 0))
            G = np.uint8(max(var_G * 255, 0))
            B = np.uint8(max(var_B * 255, 0))

    print 'end'

    return res

```

对输入图像做以下变换

<img src="http://chart.googleapis.com/chart?cht=tx&chl=l(p)\leftarrow%20\frac{\sigma%20_{b}}{\sigma%20_{a}}(l(p)-\mu%20_{A})+\mu%20_{b}" style="border:none;">

```python
def lab_stats(img_lab):

    (l, a, b) = split(img_lab)

    return {
        'l': {
            'mean': np.mean(l),
            'sigma': np.std(l),
        },
        'a': {
            'mean': np.mean(a),
            'sigma': np.std(a),
        },
        'b': {
            'mean': np.mean(b),
            'sigma': np.std(b),
        }
    }

src_lab = rgb2lab(src)
tag_lab = rgb2lab(tag)

src_stats = lab_stats(src_lab)
tag_stats = lab_stats(tag_lab)


(l, a, b) = split(tag_lab)

l = (l - tag_stats['l']['mean']) \
    * (tag_stats['l']['sigma'] / src_stats['l']['sigma']) \
    +  src_stats['l']['mean']

a = (a - tag_stats['a']['mean']) \
    * (tag_stats['a']['sigma'] / src_stats['a']['sigma']) \
    +  src_stats['a']['mean']

b = (b - tag_stats['b']['mean']) \
    * (tag_stats['b']['sigma'] / src_stats['b']['sigma']) \
    +  src_stats['b']['mean']


l = np.clip(l, 0, 255)
a = np.clip(a, 0, 255)
b = np.clip(b, 0, 255)



res_lab = np.zeros(tag.shape)

for i in range(tag.shape[0]):
    for j in range(tag.shape[1]):
        for k in range(3):
            res_lab[i, j][k] = (l, a, b)[k][i, j]

res = lab2rgb(res_lab)
```

结果示例，输入1.jpg
![](1.jpg)
和2.jpg
![](2.jpg)
输入结果图片为
![](res.jpg)
