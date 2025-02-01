---
title: "Introduction to Machine Learning"
date: "2024-03-14 15:30"
status: "published"
tags: ["machine-learning", "AI", "mathematics"]
description: "A beginner's guide to understanding the fundamentals of machine learning, including key concepts and practical examples."
mainPhoto: "/blog/intro-ml/header.jpg"
---

# 01 - Intro. to Machine Learning

Machine learning is a fascinating field that combines statistics, mathematics, and computer science. In this post, we'll explore the basic concepts and build a foundation for more advanced topics.

## Key Concepts

One of the fundamental concepts in machine learning is the [[cost function]], which represents the difference between our model's predictions and the actual values. The most common cost function is the Mean Squared Error (MSE).

### Mathematical Foundation

The Mean Squared Error can be expressed as:

$$
MSE = \frac{1}{n} \sum_{i=1}^{n} (y_i - \hat{y}_i)^2
$$

Where:
- $y_i$ is the actual value
- $\hat{y}_i$ is the predicted value
- $n$ is the number of samples

## Why Machine Learning?

Machine learning provides us with tools to:
1. Find patterns in data
2. Make predictions
3. Automate decision-making processes

More content will be added as we explore deeper into this fascinating field. 

# 01 - Intro. to Machine Learning



[[cost function]] means at least square error of estimate (I do not remember the exact name of concept).

$$
J_{(w,b)} =\dfrac{1}{2m} \sum_{i=1}^{m} ( \hat y^{(i)} - y^{(i)})^{2} 
$$
m = number of training examples...
we can write line function instead of predicted y and the aim of the our best fit line is decreasing error.

$$
J_{(w,b)} =\dfrac{1}{2m} \sum_{i=1}^{m} (f_{(w,b)}(x^{(i)}) - y^{(i)})^{2} 
$$
## Gradient Descent
gradient descent is an algorithm that you can use to try to minimize any function, not just [[cost function]] for linear regression.

### Gradient Descent Algorithm

$$
w = w - {\alpha} \frac{{\partial}}{{\partial w}} J_{(w,b)}
$$
**$\alpha$ is between 0 - 1**, it basically controls how big of a step you take downhill
	if $\alpha$ is very large then that corresponds to a very aggressive [[gradient descent]] procedure where you're trying to take huge steps downhill.
	and if $\alpha$ is very small then you'd be taking small baby steps.
and the other term which is right hand side of $\alpha$ is derivative term of the cost function J. It basically says you in which direction you want to take your baby step.
Combination with derivative term and $\alpha$ , also determines the size of the steps you want to take downhill.

the other parameter is b:
$$
b = b - \alpha \frac{{\partial}}{{\partial b}} J_{(w,b)}
$$

remember from graph where you're taking baby steps **until you get to the bottom** of the value, for the gradient descent algorithm **you are going to repeat** these two update steps **until the algorithm converges**. It means that reaching the point at a local minimum where the parameters w and b no longer change much with each additional step that you take.

> [!IMPORTANT]
> simultaneously update w and b in other words you want to update both parameters at the same time.

$$
tmp\_w = w - {\alpha} \frac{{\partial}}{{\partial w}} J_{(w,b)}  \:\:\:\:\;\; tmp\_b = b - \alpha \frac{{\partial}}{{\partial b}} J_{(w,b)} 
$$
then copy the values, 
w = tmp_w
b = tmp_b with this way you prevent the w value from changing before the tmp_b operation is performed
```
tmp_w = w - {\alpha} \frac{{\partial}}{{\partial w}} J_{(w,b)} 
tmp_b = b - \alpha \frac{{\partial}}{{\partial b}} J_{(w,b)} 
w = tmp_w
b = tmp_b
```
the code which is above is true. Also, there is a wrong implementation below:
```
tmp_w = code
w = tmp_w
tmp_b = code
b = tmp_b
```

we use partial derivatives in order to minimize J(w) also same steps occur for b this time minimize J(b). *(It is subset of [[metu-math120]] maybe you should repeat the multivariable calculus and line integral section if you stuck.)*

### Learning Rate $(\alpha)$

$$
w = w - {\alpha} \frac{{\partial}}{{\partial w}} J_{(w,b)}
$$
**$\alpha$ is a learning rate which is between 0-1.** 
	if $\alpha$ is too small (0.0000001), you are goinig to need a lot of steps to get to the minimum, ... the gradient descents will work but it will be VERY VERY SLOW.
	if $\alpha$ is too large then you update w very giant step and finally the cost has actually gotten worse. look at the below picture, you should notice you are actually getting further and further away from the minimum
	![[Pasted image 20240824001137.png]]
	another conclusion is that gradient descent may fail to converge, may even diverge


### Gradient Descent Algorithm for Linear Regression
$$
w = w - a \frac{1}{m} \sum_{i=1}^{m} (f_{w,b}(x^{(i)}) - y^{(i)}) \;x^{(i)}
$$
$$
b = b - a \frac{1}{m} \sum_{i=1}^{m} (f_{w,b}(x^{(i)}) - y^{(i)})
$$

one local minima (global minimum)
![[Pasted image 20240824003129.png]]

more than one local minimum
![[Pasted image 20240824003208.png]]


#### "Batch" gradient descent
"Batch" : Each step of gradient descent uses all the training examples




---
# References - Quotes
