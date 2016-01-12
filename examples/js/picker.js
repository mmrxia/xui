/*
 * picker.js
 * ios风格多列选择功能组件，如日期、通讯录、省市区等
 * by xqs @2016
 * */
;
(function ($) {
    'use strict';

    /*工具:支持判断*/
    $.support = (function () {
        return {
            touch: !!('ontouchstart' in window)     //是否支持touch
        }
    })();
    /*当前状态支持的事件*/
    $.events = {
        start: $.support.touch ? 'touchstart' : 'mousedown',
        move: $.support.touch ? 'touchmove' : 'mousemove',
        end: $.support.touch ? 'touchend' : 'mouseup'
    };

    var Picker = function (options) {
        var self = this;
        var defaults = {
            cols: [], //列
            realTime: true,  //实时显示文本域中的值
            callback: null, //点击确定后的回调行数，此时realTime为false
            inputReadOnly: true, //input是否只读
            toolbar: true,    //是否显示标题栏
            toolbarCloseText: '确定',  //关闭按钮文案
            toolbarTemplate: [
                '<header class="bar bar-nav">', '<button class="btn close-picker">确定</button>',
                '<h1 class="title">请选择</h1>', '</header>'
            ].join('')
        };

        /*参数*/
        self.params = $.extend({}, defaults, options);  //console.log(self.params)

        self.initialized = false; //初始化过
        self.displayValue = self.params.value || [];

        /*页面元素*/
        var elements = {
            modal: $('.picker-modal'),   //modal container
            input: $(self.params.input), //input
            container: $('.picker-items')  //items container
        };

        /*method*/
        self.init = function () {
            self.layout();
        };

        /*打开模态框*/
        self.open = function () {
            elements.modal.addClass('modal-in').removeClass('modal-out');
            //self.layout();  //注意：此处涉及到页面多个调用时，需要特殊处理，暂时留坑...
            //if(!self.initialized) self.initCols();
            self.initialized = true;
            self.initCols();


        };

        /*关闭模态框*/
        self.close = function () {
            elements.modal.addClass('modal-out').removeClass('modal-in');
        };

        /*
         * 设置布局，选项等
         * 设置列元素，写入dom
         * */
        self.layout = function () {
            var colsLen = self.params.value.length;    //初始值数组长度
            if (self.params.cols.length) {
                var arr = ['<div class="picker-center-highlight"></div>'];
                $.each(self.params.cols, function (i, v) {
                    if (colsLen && i > colsLen - 1) return false;      //按照初始值设置列
                    arr.push('<div class="picker-items-col"><div class="picker-items-col-wrapper">');
                    $.each(v.values, function (m, n) {
                        arr.push('<div class="picker-item">' + n + '</div>');
                    });
                    arr.push('</div></div>');
                });
                elements.container.empty().append(arr.join(''));
            }

        };

        /*
         * 其他调整，如月份对应的天数
         * */
        self.setValue = function () {
            if (self.params.onChange) {
                //变更值，联动处理
                self.params.onChange(self.params);
                //console.log(JSON.stringify(self.params.cols))
            }
            self.params.realTime && self.showResult();
        };

        /*input赋值*/
        self.showResult = function () {
            //console.log(self.displayValue)
            var result = {value: self.displayValue};
            console.log(self.displayValue)
            var resultValue = self.params.formatValue ? self.params.formatValue(result) : result.value.join(' ');
            var method = elements.input[0].tagName.toLowerCase() === 'input' ? 'val' : 'text';
            elements.input[method](resultValue);
        };


        /*初始化列表*/
        self.initCols = function () {
            elements.cols = elements.container.find('.picker-items-col');
            var defaultValue = self.displayValue.length && self.displayValue || self.params.value; //数组

            $.each(elements.cols, function () {
                var _this = $(this), colIndex = elements.cols.index(_this);
                //console.log(colIndex)

                var col = self.params.cols[colIndex];
                col.value = defaultValue[colIndex] || col.values[0];     //初始化值

                col.container = _this; //列容器
                col.wrapper = col.container.find('.picker-items-col-wrapper');
                col.items = col.container.find('.picker-item'); //每一行

                /*处理绑定事件
                 * @param: action[String] on/off
                 * on-绑定  off-解绑
                 * */
                col.handleEvents = function (action) {
                    col.container[action]($.events.start, fnTouchStart);
                    col.container[action]($.events.move, fnTouchMove);
                    col.container[action]($.events.end, fnTouchEnd);
                };


                /*
                 * 声明需要用到的变量
                 * */
                var isTouched, isMoved, startY, currentY, movedY, startTranslate, currentTranslate; //拖动需要用到的偏移量计算
                var colHeight, itemsHeight, itemHeight;   //高度
                var minTranslate, maxTranslate;   //防止脱出容器

                colHeight = col.container[0].offsetHeight;     //col容器高度
                itemHeight = col.items[0].offsetHeight;     //item高度
                itemsHeight = itemHeight * col.items.length;

                minTranslate = colHeight / 2 + itemHeight / 2 - itemsHeight;  //向上拖动最大偏移量
                maxTranslate = colHeight / 2 - itemHeight / 2;  //向下拖动最大偏移量


                /*选项高亮*/
                col.highlightItem = function (index, translate) {
                    if (!translate) translate = fnGetTranslate(col.wrapper[0], 'y');
                    if (!index) index = -Math.round((translate - maxTranslate) / itemHeight);  //touchmove

                    //console.log('index',index)
                    if (index < 0) index = 0;
                    if (index >= col.items.length) index = col.items.length - 1;

                    if (col.activeIndex != index) {
                        col.activeIndex = index;

                        //set values
                        self.displayValue[colIndex] = col.values[index]; //存储最终要显示的值

                        self.setValue();
                    }

                    /*选中item*/
                    col.items.eq(index).addClass('picker-selected').siblings().removeClass('picker-selected');
                };


                /*
                 * 初始化该列的默认值
                 * 设置该列的位置
                 * */
                col.setColTranslate = function (val) {
                    var activeIndex = $.inArray(val, col.values);
                    //console.log('init activeIndex',activeIndex);
                    var translateY = -activeIndex * itemHeight + maxTranslate;
                    fnTranslate(col.wrapper, translateY);
                    col.highlightItem(activeIndex, translateY);
                };


                /*
                 * 备注：
                 * touches是当前屏幕上所有触摸点的列表;
                 * targetTouches是当前对象上所有触摸点的列表;
                 * changedTouches是涉及当前事件的触摸点的列表。
                 * */
                /*touch start*/
                function fnTouchStart(e) {
                    if (isMoved || isTouched) return false;
                    e.preventDefault();
                    isTouched = true;
                    startY = e.type === 'touchstart' ? e.targetTouches ? e.targetTouches[0].pageY : e.originalEvent.targetTouches[0].pageY : e.pageY;
                    //console.log('startY',startY);

                    startTranslate = currentTranslate = fnGetTranslate(col.wrapper[0], 'y');
                    //console.log('startTranslate', typeof startTranslate, startTranslate)
                }

                /*touch move*/
                function fnTouchMove(e) {
                    if (!isTouched) return false;
                    e.preventDefault();
                    isTouched = true;

                    currentY = e.type === 'touchmove' ? e.targetTouches ? e.targetTouches[0].pageY : e.originalEvent.targetTouches[0].pageY : e.pageY;
                    movedY = currentY - startY;

                    //偏移量
                    currentTranslate = startTranslate + movedY;
                    //console.log('currentTranslate',currentTranslate);
                    if (currentTranslate > maxTranslate) currentTranslate = maxTranslate + itemHeight / 2; //向下拉取范围
                    if (currentTranslate < minTranslate) currentTranslate = minTranslate - itemHeight / 2; //向上拉取范围

                    //滑动
                    fnTranslate(col.wrapper, currentTranslate, 200);
                    col.highlightItem(null, currentTranslate);

                }

                /*touch end*/
                function fnTouchEnd(e) {
                    //console.log('fnTouchEnd')
                    isTouched = isMoved = false;
                    //偏移量
                    currentTranslate = Math.round(currentTranslate / itemHeight) * itemHeight; //四舍五入
                    if (currentTranslate > maxTranslate) currentTranslate = maxTranslate; //向下拉取范围
                    if (currentTranslate < minTranslate) currentTranslate = minTranslate; //向上拉取范围

                    //滑动
                    fnTranslate(col.wrapper, currentTranslate, 200);

                }


                /*选中默认值*/
                col.setColTranslate(col.value);

                /*绑定事件*/
                col.handleEvents('on');

            });
        };


        /*
         * Function 过渡
         * @param ele 目标元素
         * @param duration 过渡执行时间
         * */
        function fnTransition(ele, duration) {
            var _style = 'all ' + (duration || 0) + 'ms linear';
            ele.css({
                '-webkit-transition': _style,
                'transition': _style
            });
        }

        /*
         * Function 偏移
         * @param ele 目标元素
         * @param offset 偏移量
         * @param duration 过渡执行时间
         * */
        function fnTranslate(ele, offset, duration) {
            // 在 webkit-transforms用 translate3d 的动画会得到硬件加速,性能显著提高
            var _style = 'translate3d(0,' + (offset || 0) + 'px,0)';
            ele.css({
                '-webkit-transform': _style,
                'transform': _style
            });
            fnTransition(ele, duration);
        }


        /*
         * 获取偏移量
         * @param ele 目标元素
         * @param axis 轴（x/y）
         * */
        function fnGetTranslate(ele, axis) {
            //不同的浏览器估计会有不同的处理方式,此处留坑。。。
            /*
             * curStyle.transform
             * 设置  -webkit-transform: translate3d(10px,-100px,-5px);
             * 得到矩阵字符串 matrix3d(1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 10, -100, -5, 1)
             * 设置  -webkit-transform: translate3d(0,-100px,0);
             * 得到矩阵字符串 matrix(1, 0, 0, 1, 0, -100)
             * */
            var matrix, curTransform, curStyle, transformMatrix;

            if (typeof axis === 'undefined') axis = 'x';   //默认为x轴

            curStyle = window.getComputedStyle(ele, null); // 获取样式对象.
            if (window.WebKitCSSMatrix) {
                //WebKitCSSMatrix 是WebKit内核提供可计算transform的方法. 其他支持HTML5的浏览器也有各自的方法.
                transformMatrix = new WebKitCSSMatrix(curStyle.webkitTransform === 'none' ? '' : curStyle.webkitTransform);
                curTransform = (axis === 'x') ? transformMatrix.m41 : transformMatrix.m42;
            }else {
                transformMatrix = curStyle.MozTransform || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
                matrix = transformMatrix.toString().split(',');
                if (axis === 'x') curTransform = (matrix.length === 16)? parseFloat(matrix[12]) : parseFloat(matrix[4]);
                if (axis === 'y') curTransform = (matrix.length === 16)? parseFloat(matrix[13]) : parseFloat(matrix[5]);
            }

            return curTransform || 0;
        }

        /*fun: fnOnHtmlClick*/
        function fnOnHtmlClick(e) {
            if (elements.modal[0]) {
                if (e.target != elements.input[0] && !$(e.target).closest('.picker-modal')[0]) self.close();
            }
        }

        /*bind events*/
        $(document.body).on('click', '.close-picker', function () {
            self.close();
            !self.params.realTime && self.showResult();
            self.params.callback && self.params.callback();
        }).on('click', fnOnHtmlClick);

        elements.input.on('click', function (e) {
            e.stopPropagation();
            self.open();
        });

        if (!self.initialized) self.init();

    };


    $.fn.picker = function (options) {
        var args = arguments;
        return this.each(function () {
            if (!this) return;
            var $this = $(this);

            var picker = $this.data("picker");
            if (!picker) {
                var params = $.extend({
                    input: this,
                    value: $this.val() ? $this.val().split(' ') : ''
                }, options || {});
                picker = new Picker(params);
                $this.data("picker", picker);
            }
            if (typeof options === 'string') {
                picker[options].apply(picker, Array.prototype.slice.call(args, 1));
            }
        });
    };
})(window.jQuery || window.Zepto);


/*datetimePicker*/
;
(function ($) {
    "use strict";

    var M = {
        today: new Date(),
        formatNum: function (val) {
            return (val && val < 10) ? '0' + parseInt(val) : '' + val;
        },
        makeArr: function (max, min) {
            var arr = [];
            for (var i = min || 1; i <= max; i++) {
                arr.push(M.formatNum(i));
            }
            return arr;
        },
        getDaysByYearAndMonth: function (year, month) {
            var max = new Date(new Date(year, month, 1) - 1).getDate();
            return M.makeArr(max);
        },
        formatDate: function (values, format) {
            for (var i = 0; i < values.length; i++) {
                values[i] = M.formatNum(values[i]);
            }
            var o = {
                "y+": values[0] || M.today.getFullYear(), //year
                "M+": values[1] || M.today.getMonth() + 1, //month
                "d+": values[2] || M.today.getDate(), //day
                "h+": values[3] || M.today.getHours(), //hour
                "m+": values[4] || M.today.getMinutes(), //minute
                "s+": values[5] || M.today.getSeconds() //second
            };

            for (var k in o) {
                if (new RegExp("(" + k + ")").test(format)) {
                    if ("y+" === k) {
                        format = format.replace(RegExp.$1, (o[k] + "").substr(4 - RegExp.$1.length));
                    } else {
                        format = format.replace(RegExp.$1, RegExp.$1.length == 1 ? o[k] : ("00" + o[k]).substr(("" + o[k]).length));
                    }
                }
            }
            return format;
        },
    };

    /*默认参数*/
    var defaults = {
        format: 'yyyy-MM-dd hh:mm', //日期字符串格式
        value: [],  //默认值，如：['2015', '12', '29', '19', '15']
        yearLimit: [1950, 2030], //年份范围
        onChange: function (picker) {
            var days = M.getDaysByYearAndMonth(picker.cols[0].value, picker.cols[1].value);
            var currentValue = picker.cols[2].value;
            if (currentValue > days.length) currentValue = days.length; //日
            picker.cols[2].value = currentValue;

            //console.log(picker.cols[0].value, picker.cols[1].value, picker.cols[2].value)
            //console.log(picker.cols[2].setValue)
            //picker.cols[2].setValue(currentValue);
        },
        formatValue: function (params) {
            return M.formatDate(params.value, params.format || defaults.format);
        }
    };

    /*当前时间*/
    defaults.value = $.map([M.today.getFullYear(), M.today.getMonth() + 1, M.today.getDate(), M.today.getHours(), M.today.getMinutes()], function (item, index) {
        return M.formatNum(item);
    });
    console.log(defaults.value)

    /*需要显示的列数*/
    defaults.cols = [
        {
            /*年份范围*/
            values: M.makeArr(defaults.yearLimit[1], defaults.yearLimit[0])
        },
        {
            /*1-12月份*/
            values: M.makeArr(12)
        },
        {
            /*1-31日*/
            values: M.makeArr(31)
        },
        {
            /*24时*/
            values: M.makeArr(24)
        },
        {
            /*60分*/
            values: M.makeArr(60)
        },
        {
            /*60秒*/
            values: M.makeArr(60)
        }
    ];


    /*plugin*/
    $.fn.datetimePicker = function (options) {
        return this.each(function () {
            if (!this) return;
            var params = $.extend({}, defaults, options || {});
            //console.log(JSON.stringify(params))
            if (options && options.value) $(this).val(M.formatDate(params.value, params.format));
            $(this).picker(params);
        });
    };


})(window.jQuery || window.Zepto);