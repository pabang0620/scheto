const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// 드래프트 생성
const createDraft = async (req, res) => {
  try {
    const {
      companyId,
      name,
      description,
      periodStart,
      periodEnd,
      basedOnTemplateId,
      basedOnDraftId,
      metadata,
      notes,
      items = []
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // 새 버전 번호 생성
    let version = '1.0.0';
    if (basedOnDraftId) {
      const parentDraft = await prisma.scheduleDraft.findUnique({
        where: { id: basedOnDraftId }
      });
      if (parentDraft) {
        const versionParts = parentDraft.version.split('.');
        const majorVersion = parseInt(versionParts[0]);
        version = `${majorVersion + 1}.0.0`;
      }
    }

    const draft = await prisma.scheduleDraft.create({
      data: {
        companyId,
        name,
        description,
        version,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        basedOnTemplateId,
        basedOnDraftId,
        createdBy: userId,
        metadata,
        notes,
        items: {
          create: items.map(item => ({
            employeeId: item.employeeId,
            date: new Date(item.date),
            startTime: item.startTime,
            endTime: item.endTime,
            shiftType: item.shiftType || 'regular',
            shiftPatternId: item.shiftPatternId,
            notes: item.notes,
            status: item.status || 'planned',
            priority: item.priority || 'normal',
            breakTime: item.breakTime,
            estimatedWorkload: item.estimatedWorkload,
            requirements: item.requirements,
            constraints: item.constraints
          }))
        }
      },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                department: true,
                position: true
              }
            },
            shiftPattern: {
              select: {
                id: true,
                name: true,
                shiftType: true,
                color: true
              }
            }
          }
        },
        scheduleTemplate: {
          select: {
            id: true,
            name: true,
            templateType: true
          }
        }
      }
    });

    res.status(201).json({
      message: 'Schedule draft created successfully',
      data: draft
    });
  } catch (error) {
    console.error('Error creating schedule draft:', error);
    res.status(500).json({ error: 'Failed to create schedule draft' });
  }
};

// 드래프트 목록 조회
const getDrafts = async (req, res) => {
  try {
    const { companyId, status, page = 1, limit = 10 } = req.query;
    
    const where = {};
    if (companyId) where.companyId = parseInt(companyId);
    if (status) where.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [drafts, total] = await Promise.all([
      prisma.scheduleDraft.findMany({
        where,
        include: {
          items: {
            select: {
              id: true,
              employeeId: true,
              date: true,
              status: true
            }
          },
          scheduleTemplate: {
            select: {
              id: true,
              name: true,
              templateType: true
            }
          },
          parentDraft: {
            select: {
              id: true,
              name: true,
              version: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: parseInt(limit)
      }),
      prisma.scheduleDraft.count({ where })
    ]);

    res.json({
      data: drafts,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error fetching schedule drafts:', error);
    res.status(500).json({ error: 'Failed to fetch schedule drafts' });
  }
};

// 단일 드래프트 조회
const getDraftById = async (req, res) => {
  try {
    const { id } = req.params;

    const draft = await prisma.scheduleDraft.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                department: true,
                position: true,
                email: true
              }
            },
            shiftPattern: {
              select: {
                id: true,
                name: true,
                shiftType: true,
                color: true,
                startTime: true,
                endTime: true
              }
            }
          },
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' }
          ]
        },
        scheduleTemplate: {
          select: {
            id: true,
            name: true,
            templateType: true,
            description: true
          }
        },
        parentDraft: {
          select: {
            id: true,
            name: true,
            version: true,
            status: true
          }
        },
        versionDrafts: {
          select: {
            id: true,
            name: true,
            version: true,
            status: true,
            createdAt: true
          },
          orderBy: {
            version: 'desc'
          }
        }
      }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Schedule draft not found' });
    }

    res.json({ data: draft });
  } catch (error) {
    console.error('Error fetching schedule draft:', error);
    res.status(500).json({ error: 'Failed to fetch schedule draft' });
  }
};

// 드래프트 수정
const updateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name,
      description,
      periodStart,
      periodEnd,
      metadata,
      notes,
      items = []
    } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    // 드래프트 상태 확인
    const existingDraft = await prisma.scheduleDraft.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingDraft) {
      return res.status(404).json({ error: 'Schedule draft not found' });
    }

    if (existingDraft.status === 'active' || existingDraft.status === 'archived') {
      return res.status(400).json({ 
        error: 'Cannot modify draft in active or archived status' 
      });
    }

    // 트랜잭션으로 드래프트와 아이템 업데이트
    const updatedDraft = await prisma.$transaction(async (tx) => {
      // 기존 아이템들 삭제
      await tx.scheduleDraftItem.deleteMany({
        where: { draftId: parseInt(id) }
      });

      // 드래프트 업데이트
      const draft = await tx.scheduleDraft.update({
        where: { id: parseInt(id) },
        data: {
          name,
          description,
          periodStart: periodStart ? new Date(periodStart) : undefined,
          periodEnd: periodEnd ? new Date(periodEnd) : undefined,
          metadata,
          notes,
          items: {
            create: items.map(item => ({
              employeeId: item.employeeId,
              date: new Date(item.date),
              startTime: item.startTime,
              endTime: item.endTime,
              shiftType: item.shiftType || 'regular',
              shiftPatternId: item.shiftPatternId,
              notes: item.notes,
              status: item.status || 'planned',
              priority: item.priority || 'normal',
              breakTime: item.breakTime,
              estimatedWorkload: item.estimatedWorkload,
              requirements: item.requirements,
              constraints: item.constraints
            }))
          }
        },
        include: {
          items: {
            include: {
              employee: {
                select: {
                  id: true,
                  name: true,
                  department: true,
                  position: true
                }
              },
              shiftPattern: {
                select: {
                  id: true,
                  name: true,
                  shiftType: true,
                  color: true
                }
              }
            }
          }
        }
      });

      return draft;
    });

    res.json({
      message: 'Schedule draft updated successfully',
      data: updatedDraft
    });
  } catch (error) {
    console.error('Error updating schedule draft:', error);
    res.status(500).json({ error: 'Failed to update schedule draft' });
  }
};

// 드래프트 삭제
const deleteDraft = async (req, res) => {
  try {
    const { id } = req.params;

    const existingDraft = await prisma.scheduleDraft.findUnique({
      where: { id: parseInt(id) }
    });

    if (!existingDraft) {
      return res.status(404).json({ error: 'Schedule draft not found' });
    }

    if (existingDraft.status === 'active') {
      return res.status(400).json({ 
        error: 'Cannot delete active draft. Archive it first.' 
      });
    }

    await prisma.scheduleDraft.delete({
      where: { id: parseInt(id) }
    });

    res.json({ message: 'Schedule draft deleted successfully' });
  } catch (error) {
    console.error('Error deleting schedule draft:', error);
    res.status(500).json({ error: 'Failed to delete schedule draft' });
  }
};

// 드래프트 상태 변경
const updateDraftStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const validStatuses = ['draft', 'reviewing', 'active', 'archived'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        error: 'Invalid status. Must be one of: ' + validStatuses.join(', ') 
      });
    }

    const updateData = { status };
    
    // 상태별 추가 필드 설정
    if (status === 'active') {
      updateData.approvedBy = userId;
      updateData.approvedAt = new Date();
      updateData.activatedAt = new Date();
    } else if (status === 'archived') {
      updateData.archivedAt = new Date();
    }

    const updatedDraft = await prisma.scheduleDraft.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        items: {
          select: {
            id: true,
            employeeId: true,
            date: true,
            status: true
          }
        }
      }
    });

    res.json({
      message: `Schedule draft status updated to ${status}`,
      data: updatedDraft
    });
  } catch (error) {
    console.error('Error updating draft status:', error);
    res.status(500).json({ error: 'Failed to update draft status' });
  }
};

// 드래프트를 실제 스케줄로 활성화
const activateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { replaceExisting = false } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const draft = await prisma.scheduleDraft.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: true
      }
    });

    if (!draft) {
      return res.status(404).json({ error: 'Schedule draft not found' });
    }

    if (draft.status === 'active') {
      return res.status(400).json({ error: 'Draft is already active' });
    }

    await prisma.$transaction(async (tx) => {
      // 기존 스케줄 삭제 (옵션)
      if (replaceExisting) {
        await tx.schedule.deleteMany({
          where: {
            date: {
              gte: draft.periodStart,
              lte: draft.periodEnd
            }
          }
        });
      }

      // 드래프트 아이템들을 실제 스케줄로 변환
      const scheduleData = draft.items
        .filter(item => item.status !== 'excluded')
        .map(item => ({
          employeeId: item.employeeId,
          date: item.date,
          startTime: item.startTime,
          endTime: item.endTime,
          shiftType: item.shiftType,
          shiftPatternId: item.shiftPatternId,
          notes: item.notes,
          status: 'scheduled',
          priority: item.priority,
          breakTime: item.breakTime,
          estimatedWorkload: item.estimatedWorkload,
          createdBy: userId,
          updatedBy: userId
        }));

      if (scheduleData.length > 0) {
        await tx.schedule.createMany({
          data: scheduleData
        });
      }

      // 드래프트 상태를 active로 변경
      await tx.scheduleDraft.update({
        where: { id: parseInt(id) },
        data: {
          status: 'active',
          approvedBy: userId,
          approvedAt: new Date(),
          activatedAt: new Date()
        }
      });
    });

    res.json({
      message: 'Schedule draft activated successfully',
      schedulesCreated: draft.items.filter(item => item.status !== 'excluded').length
    });
  } catch (error) {
    console.error('Error activating schedule draft:', error);
    res.status(500).json({ error: 'Failed to activate schedule draft' });
  }
};

// 드래프트 복제 (새 버전 생성)
const duplicateDraft = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description } = req.body;

    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    const originalDraft = await prisma.scheduleDraft.findUnique({
      where: { id: parseInt(id) },
      include: {
        items: true
      }
    });

    if (!originalDraft) {
      return res.status(404).json({ error: 'Schedule draft not found' });
    }

    // 새 버전 번호 생성
    const versionParts = originalDraft.version.split('.');
    const majorVersion = parseInt(versionParts[0]);
    const newVersion = `${majorVersion + 1}.0.0`;

    const newDraft = await prisma.scheduleDraft.create({
      data: {
        companyId: originalDraft.companyId,
        name: name || `${originalDraft.name} (Copy)`,
        description: description || originalDraft.description,
        version: newVersion,
        periodStart: originalDraft.periodStart,
        periodEnd: originalDraft.periodEnd,
        basedOnTemplateId: originalDraft.basedOnTemplateId,
        basedOnDraftId: parseInt(id),
        createdBy: userId,
        metadata: originalDraft.metadata,
        notes: originalDraft.notes,
        items: {
          create: originalDraft.items.map(item => ({
            employeeId: item.employeeId,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            shiftType: item.shiftType,
            shiftPatternId: item.shiftPatternId,
            notes: item.notes,
            status: item.status,
            priority: item.priority,
            breakTime: item.breakTime,
            estimatedWorkload: item.estimatedWorkload,
            requirements: item.requirements,
            constraints: item.constraints
          }))
        }
      },
      include: {
        items: {
          include: {
            employee: {
              select: {
                id: true,
                name: true,
                department: true,
                position: true
              }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Schedule draft duplicated successfully',
      data: newDraft
    });
  } catch (error) {
    console.error('Error duplicating schedule draft:', error);
    res.status(500).json({ error: 'Failed to duplicate schedule draft' });
  }
};

// 드래프트 통계
const getDraftStats = async (req, res) => {
  try {
    const { companyId } = req.query;

    const where = companyId ? { companyId: parseInt(companyId) } : {};

    const stats = await prisma.scheduleDraft.groupBy({
      by: ['status'],
      where,
      _count: {
        status: true
      }
    });

    const totalItems = await prisma.scheduleDraftItem.count({
      where: {
        draft: where
      }
    });

    const result = {
      totalDrafts: stats.reduce((sum, stat) => sum + stat._count.status, 0),
      totalItems,
      byStatus: stats.reduce((acc, stat) => {
        acc[stat.status] = stat._count.status;
        return acc;
      }, {})
    };

    res.json({ data: result });
  } catch (error) {
    console.error('Error fetching draft stats:', error);
    res.status(500).json({ error: 'Failed to fetch draft statistics' });
  }
};

// 드래프트 병합
const mergeDrafts = async (req, res) => {
  try {
    const { draftIds, mergeOptions } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return res.status(401).json({ error: 'User authentication required' });
    }

    if (!draftIds || draftIds.length < 2) {
      return res.status(400).json({ 
        error: 'At least 2 drafts are required for merging' 
      });
    }

    // 기본 병합 옵션 설정
    const defaultOptions = {
      name: 'Merged Schedule Draft',
      description: 'Merged from multiple schedule drafts',
      conflictResolution: 'priority', // priority, latest, manual
      priorityOrder: [], // draftId 우선순위 배열
      mergeStrategy: 'combine', // combine, overwrite, selective
      preserveMetadata: true,
      generateNewVersion: true
    };

    const options = { ...defaultOptions, ...mergeOptions };

    // 드래프트들 조회
    const drafts = await prisma.scheduleDraft.findMany({
      where: { 
        id: { in: draftIds.map(id => parseInt(id)) },
        status: { in: ['draft', 'reviewing'] } // 활성화된 드래프트는 병합 불가
      },
      include: {
        items: {
          include: {
            employee: {
              select: { id: true, name: true, department: true, position: true }
            },
            shiftPattern: {
              select: { id: true, name: true, shiftType: true, color: true }
            }
          }
        }
      }
    });

    if (drafts.length !== draftIds.length) {
      return res.status(400).json({ 
        error: 'Some drafts not found or cannot be merged (may be active/archived)' 
      });
    }

    // 기간 범위 계산
    const allDates = drafts.flatMap(draft => [draft.periodStart, draft.periodEnd]);
    const periodStart = new Date(Math.min(...allDates));
    const periodEnd = new Date(Math.max(...allDates));

    // 충돌 감지 및 해결
    const conflicts = [];
    const mergedItems = [];
    const itemMap = new Map(); // key: employeeId-date, value: items array

    // 모든 아이템들을 맵에 정리
    drafts.forEach((draft, draftIndex) => {
      draft.items.forEach(item => {
        const key = `${item.employeeId}-${item.date.toISOString().split('T')[0]}`;
        if (!itemMap.has(key)) {
          itemMap.set(key, []);
        }
        itemMap.get(key).push({
          ...item,
          sourceDraftId: draft.id,
          sourceDraftName: draft.name,
          draftPriority: options.priorityOrder.indexOf(draft.id) !== -1 
            ? options.priorityOrder.indexOf(draft.id) 
            : draftIndex
        });
      });
    });

    // 충돌 해결 및 병합
    for (const [key, items] of itemMap) {
      if (items.length === 1) {
        // 충돌 없음 - 바로 추가
        mergedItems.push(items[0]);
      } else {
        // 충돌 있음 - 해결 전략 적용
        const [employeeId, dateStr] = key.split('-');
        const conflictInfo = {
          employeeId: parseInt(employeeId),
          date: dateStr,
          conflictingItems: items.map(item => ({
            draftId: item.sourceDraftId,
            draftName: item.sourceDraftName,
            startTime: item.startTime,
            endTime: item.endTime,
            shiftType: item.shiftType,
            priority: item.priority
          }))
        };
        conflicts.push(conflictInfo);

        let selectedItem;
        switch (options.conflictResolution) {
          case 'priority':
            // 우선순위가 높은 드래프트 선택 (낮은 인덱스가 높은 우선순위)
            selectedItem = items.reduce((prev, current) => 
              prev.draftPriority < current.draftPriority ? prev : current
            );
            break;
          case 'latest':
            // 가장 최근에 수정된 아이템 선택
            selectedItem = items.reduce((prev, current) => 
              new Date(prev.updatedAt) > new Date(current.updatedAt) ? prev : current
            );
            break;
          case 'combine':
            // 시간대가 겹치지 않으면 모두 포함, 겹치면 우선순위 적용
            const timeOverlaps = checkTimeOverlap(items);
            if (!timeOverlaps) {
              mergedItems.push(...items);
              continue;
            } else {
              selectedItem = items.reduce((prev, current) => 
                prev.draftPriority < current.draftPriority ? prev : current
              );
            }
            break;
          default:
            // 기본적으로 첫 번째 아이템 선택
            selectedItem = items[0];
        }
        
        if (selectedItem) {
          mergedItems.push(selectedItem);
        }
      }
    }

    // 새 버전 번호 생성
    const maxVersion = Math.max(...drafts.map(draft => {
      const versionParts = draft.version.split('.');
      return parseInt(versionParts[0]);
    }));
    const newVersion = `${maxVersion + 1}.0.0`;

    // 메타데이터 병합
    let mergedMetadata = {};
    if (options.preserveMetadata) {
      drafts.forEach(draft => {
        if (draft.metadata) {
          mergedMetadata = { ...mergedMetadata, ...draft.metadata };
        }
      });
    }

    // 병합된 드래프트 생성
    const mergedDraft = await prisma.scheduleDraft.create({
      data: {
        companyId: drafts[0].companyId,
        name: options.name,
        description: options.description,
        version: newVersion,
        periodStart,
        periodEnd,
        createdBy: userId,
        metadata: {
          ...mergedMetadata,
          mergeInfo: {
            sourceDrafts: drafts.map(draft => ({
              id: draft.id,
              name: draft.name,
              version: draft.version
            })),
            mergeOptions: options,
            conflictsResolved: conflicts.length,
            mergedAt: new Date().toISOString()
          }
        },
        notes: `Merged from ${drafts.length} drafts: ${drafts.map(d => d.name).join(', ')}`,
        items: {
          create: mergedItems.map(item => ({
            employeeId: item.employeeId,
            date: item.date,
            startTime: item.startTime,
            endTime: item.endTime,
            shiftType: item.shiftType,
            shiftPatternId: item.shiftPatternId,
            notes: item.notes,
            status: item.status,
            priority: item.priority,
            breakTime: item.breakTime,
            estimatedWorkload: item.estimatedWorkload,
            requirements: item.requirements,
            constraints: item.constraints
          }))
        }
      },
      include: {
        items: {
          include: {
            employee: {
              select: { id: true, name: true, department: true, position: true }
            },
            shiftPattern: {
              select: { id: true, name: true, shiftType: true, color: true }
            }
          }
        }
      }
    });

    res.status(201).json({
      message: 'Schedule drafts merged successfully',
      data: mergedDraft,
      conflicts,
      summary: {
        totalSourceDrafts: drafts.length,
        totalItemsMerged: mergedItems.length,
        conflictsResolved: conflicts.length,
        periodStart,
        periodEnd
      }
    });
  } catch (error) {
    console.error('Error merging schedule drafts:', error);
    res.status(500).json({ error: 'Failed to merge schedule drafts' });
  }
};

// 병합 미리보기
const previewMerge = async (req, res) => {
  try {
    const { draftIds, mergeOptions } = req.body;

    if (!draftIds || draftIds.length < 2) {
      return res.status(400).json({ 
        error: 'At least 2 drafts are required for preview' 
      });
    }

    // 드래프트들 조회
    const drafts = await prisma.scheduleDraft.findMany({
      where: { 
        id: { in: draftIds.map(id => parseInt(id)) },
        status: { in: ['draft', 'reviewing'] }
      },
      include: {
        items: {
          include: {
            employee: {
              select: { id: true, name: true, department: true, position: true }
            }
          }
        }
      }
    });

    // 충돌 분석
    const conflicts = [];
    const itemMap = new Map();

    drafts.forEach(draft => {
      draft.items.forEach(item => {
        const key = `${item.employeeId}-${item.date.toISOString().split('T')[0]}`;
        if (!itemMap.has(key)) {
          itemMap.set(key, []);
        }
        itemMap.get(key).push({
          ...item,
          sourceDraftId: draft.id,
          sourceDraftName: draft.name
        });
      });
    });

    for (const [key, items] of itemMap) {
      if (items.length > 1) {
        const [employeeId, dateStr] = key.split('-');
        conflicts.push({
          employeeId: parseInt(employeeId),
          employeeName: items[0].employee.name,
          date: dateStr,
          conflictingItems: items.map(item => ({
            draftId: item.sourceDraftId,
            draftName: item.sourceDraftName,
            startTime: item.startTime,
            endTime: item.endTime,
            shiftType: item.shiftType,
            hasTimeOverlap: checkTimeOverlapInConflict(items, item)
          }))
        });
      }
    }

    const summary = {
      totalDrafts: drafts.length,
      totalItems: drafts.reduce((sum, draft) => sum + draft.items.length, 0),
      totalConflicts: conflicts.length,
      draftSummary: drafts.map(draft => ({
        id: draft.id,
        name: draft.name,
        itemCount: draft.items.length,
        periodStart: draft.periodStart,
        periodEnd: draft.periodEnd
      }))
    };

    res.json({
      conflicts,
      summary,
      canMerge: true
    });
  } catch (error) {
    console.error('Error previewing merge:', error);
    res.status(500).json({ error: 'Failed to preview merge' });
  }
};

// 시간 겹침 체크 헬퍼 함수
function checkTimeOverlap(items) {
  for (let i = 0; i < items.length; i++) {
    for (let j = i + 1; j < items.length; j++) {
      const item1 = items[i];
      const item2 = items[j];
      
      if (timeRangesOverlap(item1.startTime, item1.endTime, item2.startTime, item2.endTime)) {
        return true;
      }
    }
  }
  return false;
}

function checkTimeOverlapInConflict(allItems, currentItem) {
  return allItems.some(item => {
    if (item.sourceDraftId === currentItem.sourceDraftId) return false;
    return timeRangesOverlap(
      currentItem.startTime, currentItem.endTime,
      item.startTime, item.endTime
    );
  });
}

function timeRangesOverlap(start1, end1, start2, end2) {
  const timeToMinutes = (timeStr) => {
    const [hours, minutes] = timeStr.split(':').map(Number);
    return hours * 60 + minutes;
  };
  
  const start1Min = timeToMinutes(start1);
  const end1Min = timeToMinutes(end1);
  const start2Min = timeToMinutes(start2);
  const end2Min = timeToMinutes(end2);
  
  return start1Min < end2Min && start2Min < end1Min;
}

module.exports = {
  createDraft,
  getDrafts,
  getDraftById,
  updateDraft,
  deleteDraft,
  updateDraftStatus,
  activateDraft,
  duplicateDraft,
  getDraftStats,
  mergeDrafts,
  previewMerge
};