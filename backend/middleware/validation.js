// backend/middleware/validation.js
const Joi = require('joi');

const schemas = {
  login: Joi.object({
    username: Joi.string().alphanum().min(3).max(30).required(),
    password: Joi.string().min(6).required()
  }),
  
  createProposal: Joi.object({
    title: Joi.string().min(10).max(255).required(),
    description: Joi.string().min(50).max(5000).required(),
    categoryId: Joi.number().integer().min(1).max(9).required(),
    eventDate: Joi.date().optional(),
    systemChanges: Joi.object({
      type: Joi.string().optional(),
      target: Joi.string().optional(),
      newValue: Joi.any().optional(),
      roleChanges: Joi.array().optional()
    }).optional()
  }),
  
  vote: Joi.object({
    voteType: Joi.string().valid('favor', 'abstencao', 'contra', 'veto').required()
  })
};

const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schemas[schema].validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Dados inválidos', 
        details: error.details[0].message 
      });
    }
    next();
  };
};

module.exports = validate;
