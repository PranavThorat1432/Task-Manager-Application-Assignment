import User from "../models/user.model.js"
import bcryptjs from "bcryptjs"
import { errorHandler } from "../utils/error.js"
import jwt from "jsonwebtoken"

// Input validation helpers
const isValidEmail = (email) => {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/
  return emailRegex.test(email)
}

const sanitizeString = (str) => {
  if (typeof str !== "string") return ""
  return str.trim().replace(/[<>]/g, "")
}

const isValidObjectId = (id) => {
  return /^[0-9a-fA-F]{24}$/.test(id)
}

export const signup = async (req, res, next) => {
  try {
    let { name, email, password, profileImageUrl, adminJoinCode } = req.body

    // Validate input types to prevent NoSQL injection
    if (
      typeof name !== "string" ||
      typeof email !== "string" ||
      typeof password !== "string"
    ) {
      return next(errorHandler(400, "Invalid input data types"))
    }

    // Sanitize inputs
    name = sanitizeString(name)
    email = sanitizeString(email).toLowerCase()
    password = password.trim()

    if (profileImageUrl && typeof profileImageUrl === "string") {
      profileImageUrl = sanitizeString(profileImageUrl)
    }

    if (adminJoinCode && typeof adminJoinCode === "string") {
      adminJoinCode = adminJoinCode.trim()
    }

    // Validate required fields
    if (!name || !email || !password) {
      return next(errorHandler(400, "All fields are required"))
    }

    // Validate field lengths
    if (name.length < 2 || name.length > 50) {
      return next(errorHandler(400, "Name must be between 2 and 50 characters"))
    }

    if (password.length < 6) {
      return next(errorHandler(400, "Password must be at least 6 characters"))
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return next(errorHandler(400, "Invalid email format"))
    }

    // Check if user already exists using sanitized email
    const isAlreadyExist = await User.findOne({ email: email })

    if (isAlreadyExist) {
      return next(errorHandler(400, "User already exists"))
    }

    // Check user role
    let role = "user"
    if (adminJoinCode && adminJoinCode === process.env.ADMIN_JOIN_CODE) {
      role = "admin"
    }

    const hashedPassword = bcryptjs.hashSync(password, 10)

    const newUser = new User({
      name,
      email,
      password: hashedPassword,
      profileImageUrl,
      role,
    })

    await newUser.save()

    res.status(201).json("Signup successful")
  } catch (error) {
    next(error)
  }
}

export const signin = async (req, res, next) => {
  try {
    let { email, password } = req.body

    // Validate input types to prevent NoSQL injection
    if (typeof email !== "string" || typeof password !== "string") {
      return next(errorHandler(400, "Invalid input data types"))
    }

    // Sanitize inputs
    email = sanitizeString(email).toLowerCase()
    password = password.trim()

    if (!email || !password) {
      return next(errorHandler(400, "All fields are required"))
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return next(errorHandler(400, "Invalid email format"))
    }

    const validUser = await User.findOne({ email: email })

    if (!validUser) {
      return next(errorHandler(404, "User not found!"))
    }

    // compare password
    const validPassword = bcryptjs.compareSync(password, validUser.password)

    if (!validPassword) {
      return next(errorHandler(400, "Wrong Credentials"))
    }

    const token = jwt.sign(
      { id: validUser._id, role: validUser.role },
      process.env.JWT_SECRET
    )

    const { password: pass, ...rest } = validUser._doc

    const isProduction = process.env.NODE_ENV === "production"

    res
      .status(200)
      .cookie("access_token", token, {
        httpOnly: true,
        secure: true, // Always secure for cross-domain
        sameSite: isProduction ? "none" : "lax", // 'none' for cross-domain
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      })
      .json(rest)
  } catch (error) {
    next(error)
  }
}

export const userProfile = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Validate ObjectId format to prevent injection
    if (!isValidObjectId(userId)) {
      return next(errorHandler(400, "Invalid user ID format"))
    }

    const user = await User.findById(userId)

    if (!user) {
      return next(errorHandler(404, "User not found!"))
    }

    const { password: pass, ...rest } = user._doc

    res.status(200).json(rest)
  } catch (error) {
    next(error)
  }
}

export const updateUserProfile = async (req, res, next) => {
  try {
    const userId = req.user.id

    // Validate ObjectId format
    if (!isValidObjectId(userId)) {
      return next(errorHandler(400, "Invalid user ID format"))
    }

    const user = await User.findById(userId)

    if (!user) {
      return next(errorHandler(404, "User not found!"))
    }

    // Validate and sanitize name
    if (req.body.name !== undefined) {
      if (typeof req.body.name !== "string") {
        return next(errorHandler(400, "Name must be a string"))
      }
      const sanitizedName = sanitizeString(req.body.name)
      if (sanitizedName.length < 2 || sanitizedName.length > 50) {
        return next(errorHandler(400, "Name must be between 2 and 50 characters"))
      }
      user.name = sanitizedName
    }

    // Validate and sanitize email
    if (req.body.email !== undefined) {
      if (typeof req.body.email !== "string") {
        return next(errorHandler(400, "Email must be a string"))
      }
      const sanitizedEmail = sanitizeString(req.body.email).toLowerCase()
      if (!isValidEmail(sanitizedEmail)) {
        return next(errorHandler(400, "Invalid email format"))
      }
      // Check if email already exists (excluding current user)
      const existingUser = await User.findOne({
        email: sanitizedEmail,
        _id: { $ne: userId },
      })
      if (existingUser) {
        return next(errorHandler(400, "Email already in use"))
      }
      user.email = sanitizedEmail
    }

    // Validate password
    if (req.body.password) {
      if (typeof req.body.password !== "string") {
        return next(errorHandler(400, "Password must be a string"))
      }
      const trimmedPassword = req.body.password.trim()
      if (trimmedPassword.length < 6) {
        return next(errorHandler(400, "Password must be at least 6 characters"))
      }
      user.password = bcryptjs.hashSync(trimmedPassword, 10)
    }

    const updatedUser = await user.save()

    const { password: pass, ...rest } = user._doc

    res.status(200).json(rest)
  } catch (error) {
    next(error)
  }
}

export const uploadImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(errorHandler(400, "No file uploaded"))
    }

    const imageUrl = `${req.protocol}://${req.get("host")}/uploads/${
      req.file.filename
    }`

    res.status(200).json({ imageUrl })
  } catch (error) {
    next(error)
  }
}

export const signout = async (req, res, next) => {
  try {
    const isProduction = process.env.NODE_ENV === "production"

    res
      .clearCookie("access_token", {
        httpOnly: true,
        secure: true,
        sameSite: process.env.NODE_ENV ? "none" : "lax",
      })
      .status(200)
      .json("User has been loggedout successfully!")
  } catch (error) {
    next(error)
  }
}
