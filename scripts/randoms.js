"use strict";

const allowed = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ1234567890!@#$%^&*()~_+<>?';

class Random {
  static __getRandomString(length){
    length = length || 32;
    if (length <= 13) {
      length += 13;
    }
    let s = "";
    s += (new Date()).getTime().toString();
    for (let i = 0; i < length - 13; i++) {
      s += allowed[Math.floor(Math.random() * allowed.length)];
    }
    let str = "";
    let a = s.split("");
    let n = s.length;
    for (let i = 0; i < n; i++) {
      let j = Math.floor(Math.random() * (i + 1));
      let tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }

    str = a.join("");

    return str;
  }

  static getQRCode() {
    return this.__getRandomString(32);
  }

  static getMobileField(){
    return this.__getRandomString(10);
  }
}