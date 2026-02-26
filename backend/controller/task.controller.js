import mongoose from "mongoose"
import Task from "../models/task.model.js"
import { errorHandler } from "../utils/error.js"

// Input validation and sanitization helpers
const sanitizeString = (str) => {
  if (typeof str !== "string") return ""
  return str.trim().replace(/[<>]/g, "")
}

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

const isValidStatus = (status) => {
  return ["Pending", "In Progress", "Completed"].includes(status)
}

const isValidPriority = (priority) => {
  return ["Low", "Medium", "High"].includes(priority)
}

export const createTask = async (req, res, next) => {
  try {
    let {
      title,
      description,
      priority,
      dueDate,
      assignedTo,
      attachments,
      todoChecklist,
    } = req.body

    // Validate title
    if (typeof title !== "string") {
      return next(errorHandler(400, "Title must be a string"))
    }
    title = sanitizeString(title)
    if (!title || title.length < 2 || title.length > 200) {
      return next(errorHandler(400, "Title must be between 2 and 200 characters"))
    }

    // Sanitize description
    if (description !== undefined) {
      if (typeof description !== "string") {
        return next(errorHandler(400, "Description must be a string"))
      }
      description = sanitizeString(description)
    }

    // Validate priority
    if (priority && !isValidPriority(priority)) {
      return next(errorHandler(400, "Invalid priority value"))
    }

    // Validate dueDate
    if (!dueDate) {
      return next(errorHandler(400, "Due date is required"))
    }
    const parsedDueDate = new Date(dueDate)
    if (isNaN(parsedDueDate.getTime())) {
      return next(errorHandler(400, "Invalid due date format"))
    }

    // Validate assignedTo
    if (!Array.isArray(assignedTo)) {
      return next(errorHandler(400, "assignedTo must be an array of user IDs"))
    }
    
    // Validate each assignedTo ID
    for (const userId of assignedTo) {
      if (!isValidObjectId(userId)) {
        return next(errorHandler(400, `Invalid user ID format: ${userId}`))
      }
    }

    // Sanitize attachments
    if (attachments && Array.isArray(attachments)) {
      attachments = attachments
        .filter((url) => typeof url === "string")
        .map((url) => sanitizeString(url))
    }

    // Validate todoChecklist
    if (todoChecklist && Array.isArray(todoChecklist)) {
      for (const item of todoChecklist) {
        if (typeof item.text !== "string") {
          return next(errorHandler(400, "Todo checklist text must be a string"))
        }
        item.text = sanitizeString(item.text)
        if (item.completed !== undefined && typeof item.completed !== "boolean") {
          return next(errorHandler(400, "Todo checklist completed must be a boolean"))
        }
      }
    }

    const task = await Task.create({
      title,
      description,
      priority: priority || "Low",
      dueDate: parsedDueDate,
      assignedTo,
      attachments,
      todoChecklist,
      createdBy: req.user.id,
    })

    res.status(201).json({ message: "Task created successfully", task })
  } catch (error) {
    next(error)
  }
}

export const getTasks = async (req, res, next) => {
  try {
    let { status, search, page = 1, limit = 10 } = req.query

    let filter = {}

    // Validate status if provided
    if (status) {
      if (typeof status !== "string") {
        return next(errorHandler(400, "Status must be a string"))
      }
      status = sanitizeString(status)
      if (!isValidStatus(status)) {
        return next(errorHandler(400, "Invalid status value"))
      }
      filter.status = status
    }

    // Search by title (case-insensitive partial match)
    if (search) {
      if (typeof search !== "string") {
        return next(errorHandler(400, "Search must be a string"))
      }
      const sanitizedSearch = sanitizeString(search)
      if (sanitizedSearch) {
        filter.title = { $regex: sanitizedSearch, $options: "i" }
      }
    }

    // Validate and parse pagination parameters
    const pageNumber = parseInt(page, 10)
    const limitNumber = parseInt(limit, 10)

    if (isNaN(pageNumber) || pageNumber < 1) {
      return next(errorHandler(400, "Page must be a positive number"))
    }
    if (isNaN(limitNumber) || limitNumber < 1 || limitNumber > 100) {
      return next(errorHandler(400, "Limit must be between 1 and 100"))
    }

    const skip = (pageNumber - 1) * limitNumber

    // Build authorization filter
    let authFilter = { ...filter }
    if (req.user.role !== "admin") {
      authFilter.assignedTo = req.user.id
    }

    // Get paginated tasks
    let tasks = await Task.find(authFilter)
      .populate("assignedTo", "name email profileImageUrl")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNumber)

    tasks = await Promise.all(
      tasks.map(async (task) => {
        const completedCount = task.todoChecklist.filter(
          (item) => item.completed
        ).length
        return { ...task._doc, completedCount: completedCount }
      })
    )

    // Get total count for pagination metadata
    const totalTasks = await Task.countDocuments(authFilter)
    const totalPages = Math.ceil(totalTasks / limitNumber)

    // Status summary counts
    const pendingTasks = await Task.countDocuments({
      ...filter,
      status: "Pending",
      ...(req.user.role !== "admin" && { assignedTo: req.user.id }),
    })

    const inProgressTasks = await Task.countDocuments({
      ...filter,
      status: "In Progress",
      ...(req.user.role !== "admin" && { assignedTo: req.user.id }),
    })

    const completedTasks = await Task.countDocuments({
      ...filter,
      status: "Completed",
      ...(req.user.role !== "admin" && { assignedTo: req.user.id }),
    })

    res.status(200).json({
      tasks,
      pagination: {
        currentPage: pageNumber,
        totalPages,
        totalTasks,
        limit: limitNumber,
        hasNextPage: pageNumber < totalPages,
        hasPrevPage: pageNumber > 1,
      },
      statusSummary: {
        all: totalTasks,
        pendingTasks,
        inProgressTasks,
        completedTasks,
      },
    })
  } catch (error) {
    next(error)
  }
}

export const getTaskById = async (req, res, next) => {
  try {
    const taskId = req.params.id

    // Validate ObjectId format
    if (!isValidObjectId(taskId)) {
      return next(errorHandler(400, "Invalid task ID format"))
    }

    const task = await Task.findById(taskId).populate(
      "assignedTo",
      "name email profileImageUrl"
    )

    if (!task) {
      return next(errorHandler(404, "Task not found!"))
    }

    res.status(200).json(task)
  } catch (error) {
    next(error)
  }
}

export const updateTask = async (req, res, next) => {
  try {
    const taskId = req.params.id

    // Validate ObjectId format
    if (!isValidObjectId(taskId)) {
      return next(errorHandler(400, "Invalid task ID format"))
    }

    const task = await Task.findById(taskId)

    if (!task) {
      return next(errorHandler(404, "Task not found!"))
    }

    // Validate and sanitize title
    if (req.body.title !== undefined) {
      if (typeof req.body.title !== "string") {
        return next(errorHandler(400, "Title must be a string"))
      }
      const sanitizedTitle = sanitizeString(req.body.title)
      if (sanitizedTitle.length < 2 || sanitizedTitle.length > 200) {
        return next(errorHandler(400, "Title must be between 2 and 200 characters"))
      }
      task.title = sanitizedTitle
    }

    // Sanitize description
    if (req.body.description !== undefined) {
      if (typeof req.body.description !== "string") {
        return next(errorHandler(400, "Description must be a string"))
      }
      task.description = sanitizeString(req.body.description)
    }

    // Validate priority
    if (req.body.priority) {
      if (!isValidPriority(req.body.priority)) {
        return next(errorHandler(400, "Invalid priority value"))
      }
      task.priority = req.body.priority
    }

    // Validate dueDate
    if (req.body.dueDate) {
      const parsedDueDate = new Date(req.body.dueDate)
      if (isNaN(parsedDueDate.getTime())) {
        return next(errorHandler(400, "Invalid due date format"))
      }
      task.dueDate = parsedDueDate
    }

    // Validate and sanitize todoChecklist
    if (req.body.todoChecklist !== undefined) {
      if (!Array.isArray(req.body.todoChecklist)) {
        return next(errorHandler(400, "Todo checklist must be an array"))
      }
      task.todoChecklist = req.body.todoChecklist.map((item) => {
        if (typeof item.text !== "string") {
          throw new Error("Todo checklist text must be a string")
        }
        return {
          text: sanitizeString(item.text),
          completed: typeof item.completed === "boolean" ? item.completed : false,
        }
      })
    }

    // Sanitize attachments
    if (req.body.attachments !== undefined) {
      if (!Array.isArray(req.body.attachments)) {
        return next(errorHandler(400, "Attachments must be an array"))
      }
      task.attachments = req.body.attachments
        .filter((url) => typeof url === "string")
        .map((url) => sanitizeString(url))
    }

    // Validate assignedTo
    if (req.body.assignedTo) {
      if (!Array.isArray(req.body.assignedTo)) {
        return next(
          errorHandler(400, "assignedTo must be an array of user IDs")
        )
      }
      // Validate each assignedTo ID
      for (const userId of req.body.assignedTo) {
        if (!isValidObjectId(userId)) {
          return next(errorHandler(400, `Invalid user ID format: ${userId}`))
        }
      }
      task.assignedTo = req.body.assignedTo
    }

    const updatedTask = await task.save()

    return res
      .status(200)
      .json({ updatedTask, message: "Task updated successfully!" })
  } catch (error) {
    next(error)
  }
}

export const deleteTask = async (req, res, next) => {
  try {
    const taskId = req.params.id

    // Validate ObjectId format
    if (!isValidObjectId(taskId)) {
      return next(errorHandler(400, "Invalid task ID format"))
    }

    const task = await Task.findById(taskId)

    if (!task) {
      return next(errorHandler(404, "Task not found!"))
    }

    await task.deleteOne()

    res.status(200).json({ message: "Task deleted successfully!" })
  } catch (error) {
    next(error)
  }
}

export const updateTaskStatus = async (req, res, next) => {
  try {
    const taskId = req.params.id

    // Validate ObjectId format
    if (!isValidObjectId(taskId)) {
      return next(errorHandler(400, "Invalid task ID format"))
    }

    const task = await Task.findById(taskId)

    if (!task) {
      return next(errorHandler(404, "Task not found!"))
    }

    const isAssigned = task.assignedTo.some(
      (userId) => userId.toString() === req.user.id.toString()
    )

    if (!isAssigned && req.user.role !== "admin") {
      return next(errorHandler(403, "Unauthorized"))
    }

    // Validate status
    if (req.body.status) {
      if (typeof req.body.status !== "string") {
        return next(errorHandler(400, "Status must be a string"))
      }
      const sanitizedStatus = sanitizeString(req.body.status)
      if (!isValidStatus(sanitizedStatus)) {
        return next(errorHandler(400, "Invalid status value"))
      }
      task.status = sanitizedStatus
    }

    if (task.status === "Completed") {
      task.todoChecklist.forEach((item) => (item.completed = true))
    }

    await task.save()

    res.status(200).json({ message: "Task status updated", task })
  } catch (error) {
    next(error)
  }
}

export const updateTaskChecklist = async (req, res, next) => {
  try {
    const taskId = req.params.id
    let { todoChecklist } = req.body

    // Validate ObjectId format
    if (!isValidObjectId(taskId)) {
      return next(errorHandler(400, "Invalid task ID format"))
    }

    const task = await Task.findById(taskId)

    if (!task) {
      return next(errorHandler(404, "Task not found!"))
    }

    if (!task.assignedTo.includes(req.user.id) && req.user.role !== "admin") {
      return next(errorHandler(403, "Not authorized to update checklist"))
    }

    // Validate todoChecklist
    if (!Array.isArray(todoChecklist)) {
      return next(errorHandler(400, "Todo checklist must be an array"))
    }

    // Sanitize and validate each checklist item
    task.todoChecklist = todoChecklist.map((item) => {
      if (typeof item.text !== "string") {
        return next(errorHandler(400, "Todo checklist text must be a string"))
      }
      return {
        text: sanitizeString(item.text),
        completed: typeof item.completed === "boolean" ? item.completed : false,
      }
    })

    const completedCount = task.todoChecklist.filter(
      (item) => item.completed
    ).length

    const totalItems = task.todoChecklist.length

    task.progress =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0

    if (task.progress === 100) {
      task.status = "Completed"
    } else if (task.progress > 0) {
      task.status = "In Progress"
    } else {
      task.status = "Pending"
    }

    await task.save()

    const updatedTask = await Task.findById(taskId).populate(
      "assignedTo",
      "name email profileImageUrl"
    )

    res
      .status(200)
      .json({ message: "Task checklist updated", task: updatedTask })
  } catch (error) {
    next(error)
  }
}

export const getDashboardData = async (req, res, next) => {
  try {
    // Fetch statistics
    const totalTasks = await Task.countDocuments()
    const pendingTasks = await Task.countDocuments({ status: "Pending" })
    const completedTasks = await Task.countDocuments({ status: "Completed" })
    const overdueTasks = await Task.countDocuments({
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    })

    const taskStatuses = ["Pending", "In Progress", "Completed"]

    const taskDistributionRaw = await Task.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ])

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "") //remove spaces for response keys

      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0

      return acc
    }, {})

    taskDistribution["All"] = totalTasks

    const taskPriorities = ["Low", "Medium", "High"]

    const taskPriorityLevelRaw = await Task.aggregate([
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ])

    const taskPriorityLevel = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0

      return acc
    }, {})

    // Fetch recent 10 tasks
    const recentTasks = await Task.find()
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt")

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevel,
      },

      recentTasks,
    })
  } catch (error) {
    next(error)
  }
}

export const userDashboardData = async (req, res, next) => {
  try {
    const userId = req.user.id

    // console.log(userId)

    // Convert userId to ObjectId for proper matching
    const userObjectId = new mongoose.Types.ObjectId(userId)

    // console.log(userObjectId)

    // fetch statistics for user-specific tasks
    const totalTasks = await Task.countDocuments({ assignedTo: userId })
    const pendingTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Pending",
    })
    const completedTasks = await Task.countDocuments({
      assignedTo: userId,
      status: "Completed",
    })
    const overdueTasks = await Task.countDocuments({
      assignedTo: userId,
      status: { $ne: "Completed" },
      dueDate: { $lt: new Date() },
    })

    // Task distribution by status
    const taskStatuses = ["Pending", "In Progress", "Completed"]

    const taskDistributionRaw = await Task.aggregate([
      {
        $match: { assignedTo: userObjectId },
      },
      {
        $group: { _id: "$status", count: { $sum: 1 } },
      },
    ])

    // console.log(taskDistributionRaw)

    const taskDistribution = taskStatuses.reduce((acc, status) => {
      const formattedKey = status.replace(/\s+/g, "")

      acc[formattedKey] =
        taskDistributionRaw.find((item) => item._id === status)?.count || 0

      return acc
    }, {})

    taskDistribution["All"] = totalTasks

    // Task distribution by priority
    const taskPriorities = ["Low", "Medium", "High"]

    const taskPriorityLevelRaw = await Task.aggregate([
      { $match: { assignedTo: userObjectId } },
      {
        $group: {
          _id: "$priority",
          count: { $sum: 1 },
        },
      },
    ])

    const taskPriorityLevel = taskPriorities.reduce((acc, priority) => {
      acc[priority] =
        taskPriorityLevelRaw.find((item) => item._id === priority)?.count || 0

      return acc
    }, {})

    const recentTasks = await Task.find({ assignedTo: userObjectId })
      .sort({ createdAt: -1 })
      .limit(10)
      .select("title status priority dueDate createdAt")

    res.status(200).json({
      statistics: {
        totalTasks,
        pendingTasks,
        completedTasks,
        overdueTasks,
      },
      charts: {
        taskDistribution,
        taskPriorityLevel,
      },
      recentTasks,
    })
  } catch (error) {
    next(error)
  }
}
