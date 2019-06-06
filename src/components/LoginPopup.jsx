import React, { Component } from 'react';
import { showToast } from '../widget/toast';

import * as papaver from '../apis/papaver';
import util from '../core/util';
import { LANDING_TIKET_URL, APP_ID } from '../core/env';

import UserService from '../services/UserService';
import { requestCaptcha } from '../apis/rings';


export default class LoginPopup extends Component {

    userService: UserService = UserService.getInstance();

    constructor(props) {
        super(props);

        this.state = {
            isShowCaptcha: false
        };
    }

    onSubmit = (e) => {
        e.preventDefault();
    }

    sendSms = async () => {
        if (this.state.smsTime > 0) return;

        var phoneNo = this.state.phoneNo;

        if (!phoneNo) {
            showToast('请输入手机号！');
            return;
        } else if (!util.validateMobile(phoneNo)) {
            showToast('手机号不正确');
            return;
        }

        var res;
        if (this.state.isShowCaptcha) {
            if (!this.state.captcha || !this.state.captchaKey) {
                showToast('请输入图形验证码');
                return;
            }
            res = await papaver.requestSmsVerifyCodeWithCaptcha(phoneNo, this.state.captchaKey, this.state.captcha);
        } else {
            res = await papaver.requestSmsVerifyCode(phoneNo);
        }
        if (!res.data || !res.data.value) {
            if (res.stat.stateList[0].code === 50250021) {
                showToast('请输入图形验证码');
                this.changeCaptcha();
                this.setState({
                    isShowCaptcha: true
                });
                return;
            } else if (res.stat.stateList[0].code === -380) {
                showToast('您的帐号已被锁定，请稍候再试');
                this.changeCaptcha();
                this.setState({
                    isShowCaptcha: true
                });
                return;
            } else if (res.stat.stateList[0].code === 50250022) {
                showToast('请输入正确的图形验证码');
                this.changeCaptcha();
                return;
            }
            showToast('验证码发送失败');
            return;
        }

        this.setState({
            hasSendSMS: true,
            smsTime: 60
        });

        this.leftTime = Date.now() + 60 * 1000;
        this.timer = setInterval(() => {
            var left = Math.round((this.leftTime - Date.now()) / 1000);

            if (left <= 0) {
                clearInterval(this.timer);
                this.setState({
                    smsTime: 0
                });
            } else {
                this.setState({
                    smsTime: left
                });
            }
        }, 1000);

        this.setState({
            smsTime: 59
        });
    }

    updatePhoneNumber = (e) => {
        this.setState({ phoneNo: e.target.value });
    }

    updateSms = (e) => {
        this.setState({ sms: e.target.value });
    }

    updateCaptcha = (e) => {
        this.setState({ captcha: e.target.value });
    }

    changeCaptcha = async () => {
        var res = await requestCaptcha();

        this.setState({
            captchaKey: res.data.key,
            captchaImage: res.data.imgUrl
        });
    }

    login = async () => {
        this.setState({
            isLoading: true
        });

        let url = `${LANDING_TIKET_URL}?appId=${APP_ID}&mobile=${this.state.phoneNo}&smsPassword=${this.state.sms}&needRedirect=false`;
        let response = await fetch(url, {
            method: 'post',
            credentials: 'include'
        });
        let content = await response.text();

        this.setState({
            isLoading: false
        });

        try {
            const res = JSON.parse(content);
            if (res.success) {
                this.props.onClose(null, true);
                return;
            } else {
                showToast(res.errorMessage);
            }
        } catch (e) {
            showToast('登录失败，请稍后再试');
        }
    }

    render() {
        var smsTime = this.state.smsTime;

        return (
            <form className="ta_c pt_1" onSubmit={this.onSubmit}>
                <button className="bg_0000 w_m h_m iconfont icon-close dock_tr mr_s mt_s" onClick={this.props.onClose}></button>
                <h1 className="fs_xl mt_xxl mb_xl fw_n">平安好医生手机快速登录{this.state.isShowCaptcha}</h1>
                <div className="mobi h_m flex bd_all mb_xl">
                    <input className="flexitem fs_m pl_m" type="tel" onChange={this.updatePhoneNumber} placeholder="请输入手机号" />
                </div>
                {
                    !!this.state.isShowCaptcha && (
                        <div className="pwd h_m flex bd_all mb_xxl">
                            <input onChange={this.updateCaptcha} className="flex_0 h_m fs_m pl_m" type="text" placeholder="请输入图形验证码" />
                            <img src={this.state.captchaImage} alt="" onClick={this.changeCaptcha} className="flex_0 h_m bg_fff fs_m" />
                        </div>
                    )
                }
                <div className="pwd h_m flex bd_all mb_xxl">
                    <input onChange={this.updateSms} className="flex_0 h_m fs_m pl_m" type="tel" placeholder="请输入验证码" />
                    <button onClick={this.sendSms} className="flex_0 h_m bg_fff fs_m" disabled={!!smsTime || !this.state.phoneNo}>{!smsTime ? '获取验证码' : (smsTime + '秒后重发')}</button>
                </div>
                <button onClick={this.login} className="btn mb_l h_m bg_app cl_fff fs_m br_4" disabled={!this.state.phoneNo || !this.state.hasSendSMS || !this.state.sms || this.state.isLoading}>{this.state.isLoading ? '正在登录...' : '登录'}</button>
                <div className="fs_s pb_l">商品由平安集团旗下平安好医生提供</div>
            </form>
        );
    }
}