const router = require('express').Router();
const ctrl = require('../controllers/pedidoController');
const { autenticar, autorizar } = require('../middlewares/auth');

router.use(autenticar);

router.post('/', autorizar('cliente'), ctrl.criar);
router.get('/', autorizar('administrador', 'vendedor', 'cliente'), ctrl.listar);
router.get('/:id', ctrl.detalhar);
router.post('/:id/confirmar', autorizar('vendedor'), ctrl.confirmarVenda);
router.patch('/:id/status', autorizar('vendedor', 'administrador'), ctrl.atualizarStatus);

module.exports = router;
