'use strict';

const Service = require('egg').Service;
const request = require('request');
const md5 = require('md5');

class OrderService extends Service {
  async update() {
    // 更新未支付订单
    const {
      ctx,
      app,
      config: { orderValidity },
    } = this;
    const { Op } = app.Sequelize;
    await ctx.model.Orders.update(
      {
        pay_status: '已过期',
      },
      {
        where: {
          created_at: {
            [Op.lt]: +new Date() - orderValidity * 60 * 1000,
          },
          pay_status: '未支付',
        },
      }
    );
  }
  async createOrder(qr_url, qr_price) {
    // 生成支付宝订单
    const { ctx } = this;
    const {
      order_id,
      user_id,
      video_id,
      share_code,
      order_type,
      order_price,
      sign,
      order_name,
      extension,
      redirect_url,
      effective_time
    } = ctx.request.body;

    console.log('fuck the code❤️❤️', user_id)
    return ctx.model.Orders.create({
      order_id,
      user_id,
      video_id,
      share_code,
      order_type,
      order_price,
      sign,
      order_name,
      extension,
      redirect_url,
      qr_url,
      qr_price,
      effective_time
    });
  }
  async find_more_price(data, order_type) {
    const { ctx, app } = this;
    const { Op } = app.Sequelize;
    return ctx.model.Orders.findAll({
      where: {
        qr_price: {
          [Op.or]: data,
        },
        order_type,
        pay_status: '未支付',
      },
    });
  }
  async save_order(qr_price, order_type) {
    // 根据客户端推送来的金额和收款方式修改订单状态
    const {
      ctx,
      app,
      config: { orderValidity, secretkey },
    } = this;
    const { Op } = app.Sequelize;
    try {
      const orderData = await ctx.model.Orders.findOne({
        where: {
          qr_price,
          order_type,
          pay_status: '未支付',
          created_at: {
            [Op.gt]: +new Date() - orderValidity * 60 * 1000,
          },
        },
      });
      const result = await ctx.model.Orders.update(
        {
          pay_status: '已支付',
        },
        {
          where: {
            qr_price,
            order_type,
            pay_status: '未支付',
            created_at: {
              [Op.gt]: +new Date() - orderValidity * 60 * 1000,
            },
          },
        }
      );
      if (result[0] === 0) {
        return false;
      }
      const {
        order_id,
        video_id,
        share_code,
        qr_price: price,
        extension,
        redirect_url,
      } = orderData;
      // sign md5(md5(order_id) + secretkey)
      const sign = md5(md5(order_id) + secretkey);
      const questBody = {
        orderId: order_id,
        videoUrl: video_id,
        invitedCode: share_code,
        price: price
      };
      await this.get_redirect_url(redirect_url, questBody);
      // const url = redirect_url + '?order_id=' + order_id  + '&qr_price=' + price + '&extension=' + extension + '&sign=' + sign;
      // await this.get_redirect_url(url);
      return true;
    } catch (e) {
      return false;
    }
  }
  async get_redirect_url(redirect_url, questBody) {
    let headers = {
      'User-Agent': `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`,
    };

    // request.set('User-Agent', `Mozilla/5.0 (iPhone; CPU iPhone OS 11_0 like Mac OS X) AppleWebKit/604.1.38 (KHTML, like Gecko) Version/11.0 Mobile/15A372 Safari/604.1`)
    request.post(
      redirect_url,
      {
        json: questBody,
        headers: headers
      },
      (error) => {
        if (error) {
          console.log('收款通知失败,请检查redirect_url是否正确!' + redirect_url);
        }else{
          console.log('收款成功，已通知服务器' + redirect_url);
        }
      }
    )
    // .then((res) => {
    //   console.log('返回信息' + res.msg);
    // });

    // request.get(redirect_url, error => {
    //   if (error) {
    //     console.log('收款通知失败,请检查redirect_url是否正确!' + redirect_url);
    //   } else {
    //     console.log('收款成功，已通知服务器' + redirect_url);
    //   }
    // });
  }
  async order_Pay_Status(order_id) {
    // 用户查询订单支付状态

    const {
      ctx,
      app,
      config: { orderValidity, secretkey },
    } = this;
    const { Op } = app.Sequelize;
    console.log('查询订单支付状态, service层', order_id);

    // try {
    //   const orderData = await ctx.modle.Orders.findOne({
    //     where: {

    //     }

    //   })
    // }
  }
}

module.exports = OrderService;
