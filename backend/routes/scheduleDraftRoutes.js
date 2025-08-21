const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/scheduleDraftController');

// 인증 미들웨어 (필요한 경우)
// const authenticateToken = require('../middlewares/authMiddleware');
// router.use(authenticateToken);

// 드래프트 CRUD 라우트
router.post('/', createDraft);                    // POST /api/schedule-drafts
router.get('/', getDrafts);                       // GET /api/schedule-drafts
router.get('/stats', getDraftStats);              // GET /api/schedule-drafts/stats
router.get('/:id', getDraftById);                 // GET /api/schedule-drafts/:id
router.put('/:id', updateDraft);                  // PUT /api/schedule-drafts/:id
router.delete('/:id', deleteDraft);               // DELETE /api/schedule-drafts/:id

// 드래프트 상태 관리 라우트
router.patch('/:id/status', updateDraftStatus);   // PATCH /api/schedule-drafts/:id/status
router.post('/:id/activate', activateDraft);      // POST /api/schedule-drafts/:id/activate
router.post('/:id/duplicate', duplicateDraft);    // POST /api/schedule-drafts/:id/duplicate

// 드래프트 병합 라우트
router.post('/merge/preview', previewMerge);      // POST /api/schedule-drafts/merge/preview
router.post('/merge', mergeDrafts);               // POST /api/schedule-drafts/merge

module.exports = router;