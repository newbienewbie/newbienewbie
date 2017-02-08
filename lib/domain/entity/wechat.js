/* jshint indent: 1 */

module.exports = function(sequelize, DataTypes) {
	return sequelize.define('wechat', {
		id: {
			type: DataTypes.INTEGER(11),
			allowNull: false,
			primaryKey: true,
			autoIncrement: true,
			field: 'id'
		},
		appid: {
			type: DataTypes.STRING,
			allowNull: true,
			field: 'appid'
		},
		token: {
			type: DataTypes.STRING,
			allowNull: true,
			field: 'token'
		},
		encodingAesKey: {
			type: DataTypes.STRING,
			allowNull: true,
			field: 'encodingAESKey'
		}
	}, {
		tableName: 'wechat',
		timestamps:false
	});
};
