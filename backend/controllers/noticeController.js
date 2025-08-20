const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// @desc    Get all notices with pagination and filtering
// @route   GET /api/notices
// @access  Private
const getAllNotices = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      type,
      priority,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const take = parseInt(limit);

    // Build where clause
    const where = {};

    // Filter by type
    if (type) {
      where.type = type;
    }

    // Filter by priority
    if (priority) {
      where.priority = priority;
    }

    // Only show notices that haven't expired
    where.OR = [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } }
    ];

    // Build orderBy clause
    const orderBy = {};
    orderBy[sortBy] = sortOrder;

    // If sorting by other fields, add secondary sort by pinned status and creation date
    const orderByClause = [];
    if (sortBy !== 'isPinned') {
      orderByClause.push({ isPinned: 'desc' });
    }
    orderByClause.push(orderBy);
    if (sortBy !== 'createdAt') {
      orderByClause.push({ createdAt: 'desc' });
    }

    // Get notices with pagination
    const [notices, total] = await Promise.all([
      prisma.notice.findMany({
        where,
        skip,
        take,
        orderBy: orderByClause,
        include: {
          creator: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true
            }
          },
          readByUsers: {
            where: {
              userId: req.userId
            },
            select: {
              readAt: true
            }
          },
          _count: {
            select: {
              readByUsers: true
            }
          }
        }
      }),
      prisma.notice.count({ where })
    ]);

    // Add isRead status and readCount to each notice
    const noticesWithStatus = notices.map(notice => ({
      ...notice,
      isRead: notice.readByUsers.length > 0,
      readAt: notice.readByUsers[0]?.readAt || null,
      readCount: notice._count.readByUsers,
      readByUsers: undefined,
      _count: undefined
    }));

    res.json({
      notices: noticesWithStatus,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get notices error:', error);
    res.status(500).json({ message: 'Failed to get notices' });
  }
};

// @desc    Get notice by ID
// @route   GET /api/notices/:id
// @access  Private
const getNoticeById = async (req, res) => {
  try {
    const { id } = req.params;
    
    // id가 undefined이거나 'undefined' 문자열인 경우 처리
    if (!id || id === 'undefined') {
      return res.status(400).json({ message: 'Notice ID is required' });
    }

    const notice = await prisma.notice.findUnique({
      where: { id: parseInt(id) },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        readByUsers: {
          where: {
            userId: req.userId
          },
          select: {
            readAt: true
          }
        },
        _count: {
          select: {
            readByUsers: true
          }
        }
      }
    });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Check if notice has expired
    if (notice.expiresAt && new Date(notice.expiresAt) < new Date()) {
      return res.status(410).json({ message: 'Notice has expired' });
    }

    // Add isRead status
    const noticeWithStatus = {
      ...notice,
      isRead: notice.readByUsers.length > 0,
      readAt: notice.readByUsers[0]?.readAt || null,
      readCount: notice._count.readByUsers,
      readByUsers: undefined,
      _count: undefined
    };

    res.json(noticeWithStatus);
  } catch (error) {
    console.error('Get notice error:', error);
    res.status(500).json({ message: 'Failed to get notice' });
  }
};

// @desc    Create new notice
// @route   POST /api/notices
// @access  Private (Admin only)
const createNotice = async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'general',
      priority = 'medium',
      isPinned = false,
      expiresAt
    } = req.body;

    // Validation
    if (!title || !content) {
      return res.status(400).json({ message: 'Title and content are required' });
    }

    // Validate type
    const validTypes = ['general', 'policy', 'schedule', 'emergency'];
    if (!validTypes.includes(type)) {
      return res.status(400).json({ 
        message: 'Invalid type. Must be one of: ' + validTypes.join(', ')
      });
    }

    // Validate priority
    const validPriorities = ['low', 'medium', 'high', 'critical'];
    if (!validPriorities.includes(priority)) {
      return res.status(400).json({ 
        message: 'Invalid priority. Must be one of: ' + validPriorities.join(', ')
      });
    }

    // Parse expiresAt if provided
    let expiresAtDate = null;
    if (expiresAt) {
      expiresAtDate = new Date(expiresAt);
      if (isNaN(expiresAtDate.getTime())) {
        return res.status(400).json({ message: 'Invalid expires date format' });
      }
      if (expiresAtDate <= new Date()) {
        return res.status(400).json({ message: 'Expires date must be in the future' });
      }
    }

    const notice = await prisma.notice.create({
      data: {
        title,
        content,
        type,
        priority,
        isPinned,
        expiresAt: expiresAtDate,
        createdBy: req.userId
      },
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Notice created successfully',
      notice: {
        ...notice,
        isRead: false,
        readAt: null,
        readCount: 0
      }
    });
  } catch (error) {
    console.error('Create notice error:', error);
    res.status(500).json({ message: 'Failed to create notice' });
  }
};

// @desc    Update notice
// @route   PUT /api/notices/:id
// @access  Private (Admin only)
const updateNotice = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      title,
      content,
      type,
      priority,
      isPinned,
      expiresAt
    } = req.body;

    // Check if notice exists
    const existingNotice = await prisma.notice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingNotice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    // Build update data
    const updateData = {};
    
    if (title !== undefined) {
      if (!title.trim()) {
        return res.status(400).json({ message: 'Title cannot be empty' });
      }
      updateData.title = title;
    }

    if (content !== undefined) {
      if (!content.trim()) {
        return res.status(400).json({ message: 'Content cannot be empty' });
      }
      updateData.content = content;
    }

    if (type !== undefined) {
      const validTypes = ['general', 'policy', 'schedule', 'emergency'];
      if (!validTypes.includes(type)) {
        return res.status(400).json({ 
          message: 'Invalid type. Must be one of: ' + validTypes.join(', ')
        });
      }
      updateData.type = type;
    }

    if (priority !== undefined) {
      const validPriorities = ['low', 'medium', 'high', 'critical'];
      if (!validPriorities.includes(priority)) {
        return res.status(400).json({ 
          message: 'Invalid priority. Must be one of: ' + validPriorities.join(', ')
        });
      }
      updateData.priority = priority;
    }

    if (isPinned !== undefined) {
      updateData.isPinned = Boolean(isPinned);
    }

    if (expiresAt !== undefined) {
      if (expiresAt === null) {
        updateData.expiresAt = null;
      } else {
        const expiresAtDate = new Date(expiresAt);
        if (isNaN(expiresAtDate.getTime())) {
          return res.status(400).json({ message: 'Invalid expires date format' });
        }
        if (expiresAtDate <= new Date()) {
          return res.status(400).json({ message: 'Expires date must be in the future' });
        }
        updateData.expiresAt = expiresAtDate;
      }
    }

    const updatedNotice = await prisma.notice.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        creator: {
          select: {
            id: true,
            name: true,
            email: true,
            role: true
          }
        },
        readByUsers: {
          where: {
            userId: req.userId
          },
          select: {
            readAt: true
          }
        },
        _count: {
          select: {
            readByUsers: true
          }
        }
      }
    });

    res.json({
      message: 'Notice updated successfully',
      notice: {
        ...updatedNotice,
        isRead: updatedNotice.readByUsers.length > 0,
        readAt: updatedNotice.readByUsers[0]?.readAt || null,
        readCount: updatedNotice._count.readByUsers,
        readByUsers: undefined,
        _count: undefined
      }
    });
  } catch (error) {
    console.error('Update notice error:', error);
    res.status(500).json({ message: 'Failed to update notice' });
  }
};

// @desc    Delete notice
// @route   DELETE /api/notices/:id
// @access  Private (Admin only)
const deleteNotice = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notice exists
    const existingNotice = await prisma.notice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingNotice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    await prisma.notice.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Notice deleted successfully' });
  } catch (error) {
    console.error('Delete notice error:', error);
    res.status(500).json({ message: 'Failed to delete notice' });
  }
};

// @desc    Mark notice as read
// @route   POST /api/notices/:id/read
// @access  Private
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if notice exists and is not expired
    const notice = await prisma.notice.findUnique({
      where: { id: parseInt(id) }
    });

    if (!notice) {
      return res.status(404).json({ message: 'Notice not found' });
    }

    if (notice.expiresAt && new Date(notice.expiresAt) < new Date()) {
      return res.status(410).json({ message: 'Notice has expired' });
    }

    // Check if already read
    const existingRead = await prisma.noticeRead.findUnique({
      where: {
        noticeId_userId: {
          noticeId: parseInt(id),
          userId: req.userId
        }
      }
    });

    if (existingRead) {
      return res.json({ 
        message: 'Notice already marked as read',
        readAt: existingRead.readAt
      });
    }

    // Mark as read
    const noticeRead = await prisma.noticeRead.create({
      data: {
        noticeId: parseInt(id),
        userId: req.userId
      }
    });

    res.json({
      message: 'Notice marked as read',
      readAt: noticeRead.readAt
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({ message: 'Failed to mark notice as read' });
  }
};

// @desc    Get unread notices count
// @route   GET /api/notices/unread/count
// @access  Private
const getUnreadCount = async (req, res) => {
  try {
    // Get total notices that are not expired
    const totalNotices = await prisma.notice.count({
      where: {
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    // Get read notices count for current user
    const readNoticesCount = await prisma.noticeRead.count({
      where: {
        userId: req.user.id,
        notice: {
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        }
      }
    });

    const unreadCount = totalNotices - readNoticesCount;

    res.json({ 
      unreadCount,
      totalNotices,
      readCount: readNoticesCount
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({ message: 'Failed to get unread count' });
  }
};

module.exports = {
  getAllNotices,
  getNoticeById,
  createNotice,
  updateNotice,
  deleteNotice,
  markAsRead,
  getUnreadCount
};