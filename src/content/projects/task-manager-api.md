---
title: 'Task Manager REST API'
description: 'A RESTful API for task management built with Node.js, Express, and MongoDB with JWT authentication.'
pubDate: 'Dec 10 2023'
heroImage: '../../assets/blog-placeholder-2.jpg'
tags: ['nodejs', 'express', 'mongodb', 'jwt', 'rest-api']
category: 'api'
author: 'Burak Sahin'
github: 'https://github.com/busahinku/task-api'
status: 'completed'
---

## Overview

A robust REST API for managing tasks with user authentication, built following best practices for API design.

## Features

- **Authentication**: JWT-based authentication system
- **CRUD Operations**: Full create, read, update, delete for tasks
- **User Management**: User registration and profile management
- **Validation**: Input validation with Joi
- **Documentation**: Swagger/OpenAPI documentation

## API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
GET    /api/tasks
POST   /api/tasks
PUT    /api/tasks/:id
DELETE /api/tasks/:id
```

## Architecture

The API follows a layered architecture with controllers, services, and data access layers for clean separation of concerns.
