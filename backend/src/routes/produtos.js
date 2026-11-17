const router = require('express').Router();
const ctrl = require('../controllers/produtoController');
const { autenticar, autorizar } = require('../middlewares/auth');

router.get('/', ctrl.listar);
router.get('/:id', ctrl.detalhar);
router.post('/', autenticar, autorizar('administrador'), ctrl.criar);
router.put('/:id', autenticar, autorizar('administrador'), ctrl.atualizar);
router.delete('/:id', autenticar, autorizar('administrador'), ctrl.remover);
router.patch('/:id/estoque', autenticar, autorizar('administrador', 'vendedor'), ctrl.atualizarEstoque);

module.exports = router;
