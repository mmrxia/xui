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
            atOnce: true,  //实时显示文本域中的值
            suffix: true,  //时候显示后缀，如日期的年月日时分秒
            onOpen: null, //打开模态框后的回调行数
            onClose: null, //关闭模态框后的回调行数，此时realTime为false
            inputReadOnly: true, //input是否只读
            toolbarTitle: '请选择',  //关闭按钮文案
            toolbarCloseText: '确定'  //关闭按钮文案
        };

        /*参数*/
        var params = $.extend({}, defaults, options);  //console.log(params)

        /*头部dom结构*/
        params.toolbarTpl = [
            '<header class="tool-bar">', '<h1 class="title">' + params.toolbarTitle + '</h1>',
            '<button class="close-picker">' + params.toolbarCloseText + '</button>', '</header>'
        ].join('');

        self.initialized = false; //初始化过
        self.opened = false; //模态框是否已打开
        self.inline = false;
        self.displayValue = params.value.concat() || [];    //最终要显示的值数组,concat避免引用改变原值

        /*页面元素*/
        var elements = {
            body: $(document.body),
            input: $(params.input) //input
        };

        self.inline = elements.modal ? true : false;   //当前模态框存在


        /*=====================
         * method
         * =====================*/

        /*
         * 设置布局，选项等
         * 设置列元素，写入dom
         * */
        self.layout = function () {
            var colsLen = params.value.length;    //初始值数组长度
            var arr = ['<div class="picker-modal modal-out" style="display:block">', params.toolbarTpl, '<div class="picker-items"><div class="picker-center-highlight"></div>'];
            if (params.cols.length) {
                $.each(params.cols, function (i, v) {
                    if (colsLen && i > colsLen - 1) return false;      //按照初始值设置列
                    arr.push('<div class="picker-items-col"><div class="picker-items-col-wrapper">');
                    $.each(v.values, function (m, n) {
                        var text = params.suffix && v.suffix ? n + v.suffix : n;
                        arr.push('<div class="picker-item">' + text + '</div>');
                    });
                    arr.push('</div></div>');
                });
                arr.push('</div></div>');
            }
            return $(arr.join('')).appendTo(elements.body);
        };

        /*打开模态框*/
        self.open = function () {

            if (!self.opened) {
                self.initialized = true;

                if (!self.inline) {
                    elements.modal = $(self.layout()); //设置dom
                    elements.cols = elements.modal.find('.picker-items-col');

                    elements.modal.on('close', function () {
                        var thisModal = $(this);
                        self.opened = false;

                        thisModal.addClass('modal-out').removeClass('modal-in');
                        var t = setTimeout(function () {
                            clearTimeout(t);
                            thisModal.remove();
                        }, 400);

                        (function () {
                            if (!params.atOnce || params.onClose) {
                                var args = {format: params.format, value: self.displayValue};  //args
                                var result = {input: elements.input, value: self.displayValue}; //return result obj
                                if (params.formatValue) result.string = params.formatValue(args); //console.log(result)
                                params.onClose.call(elements.input, result);//关闭后的回调函数
                            }
                        })();

                    });
                }

                $.each(elements.cols, function () {
                    self.initCols(this); //初始化列
                });

                //console.log(elements.modal)
                elements.modal.show().addClass('modal-in').removeClass('modal-out');

            }

            self.opened = true; //set flag

            /*打开后的回调函数*/
            if (params.onOpen) params.onOpen();


        };

        /*关闭模态框*/
        self.close = function () {
            if (!self.opened) return;
            elements.modal.trigger('close');
        };

        /*
         * 其他调整，如月份对应的天数
         * */
        self.setValue = function () {
            if (params.onChange) {
                //变更值，联动处理
                params.onChange(params);
                //console.log(JSON.stringify(params.cols))
            }
            params.atOnce && self.showResult();
        };

        /*input赋值*/
        self.showResult = function () {
            //console.log(elements.adang)
            var result = {value: self.displayValue};
            var resultValue = params.formatValue ? params.formatValue(result) : result.value.join(' ');
            var method = elements.input[0].tagName.toLowerCase() === 'input' ? 'val' : 'text';
            //console.log(elements.input[0].outerHTML)
            elements.input[method](resultValue);
        };


        /*初始化列表*/
        self.initCols = function (ele) {
            var defaultValue = self.displayValue.length && self.displayValue || params.value; //数组

            var $this = $(ele), colIndex = elements.cols.index($this);
            //console.log(colIndex)

            var col = params.cols[colIndex];
            col.value = defaultValue[colIndex] || col.values[0];     //初始化值

            col.container = $this; //列容器
            col.wrapper = col.container.find('.picker-items-col-wrapper');
            col.items = col.container.find('.picker-item'); //每一行


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


            /*
             * 初始化该列的默认值
             * 设置该列的位置
             * */
            col.setColTranslate = function (val) {
                var activeIndex = col.activeIndex = $.inArray(val, col.values);
                //console.log('init activeIndex',activeIndex);
                var translateY = -activeIndex * itemHeight + maxTranslate;
                fnTranslate(col.wrapper, translateY);
                col.highlightItem(activeIndex, translateY);
            };

            /*选项高亮*/
            col.highlightItem = function (index, translate) {
                if (!translate) translate = fnGetTranslate(col.wrapper[0], 'y');
                if (!index) index = -Math.round((translate - maxTranslate) / itemHeight);  //touchmove

                //console.log('index',index)
                if (index < 0) index = 0;
                if (index >= col.items.length) index = col.items.length - 1;

                //set values
                self.displayValue[colIndex] = col.value = col.values[index]; //存储最终要显示的值

                //console.log(col.activeIndex,index)
                if (col.activeIndex != index) {
                    col.activeIndex = index;
                    self.setValue();
                }

                /*选中item*/
                col.items.eq(index).addClass('picker-selected').siblings().removeClass('picker-selected');
            };


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
            } else {
                transformMatrix = curStyle.MozTransform || curStyle.transform || curStyle.getPropertyValue('transform').replace('translate(', 'matrix(1, 0, 0, 1,');
                matrix = transformMatrix.toString().split(',');
                if (axis === 'x') curTransform = (matrix.length === 16) ? parseFloat(matrix[12]) : parseFloat(matrix[4]);
                if (axis === 'y') curTransform = (matrix.length === 16) ? parseFloat(matrix[13]) : parseFloat(matrix[5]);
            }

            return curTransform || 0;
        }

        /*fnOnHtmlClick*/
        function fnOnHtmlClick(e) {
            if (e.target != elements.input[0] && !$(e.target).closest('.picker-modal')[0]) {
                var modal = $('.picker-modal.modal-in');
                modal.trigger('close');
            }
        }


        /*初始化*/
        if (params.inputReadOnly) elements.input.attr('readonly', true);

        /*
         * input onClick
         * */
        if (!self.inline) {
            $(window).off().on('click touchend', fnOnHtmlClick);
            elements.input.on('click', function (e) {
                e.stopPropagation();
                if (!self.opened) {
                    var modal = $('.picker-modal.modal-in');
                    modal.trigger('close');
                    self.open();
                }
            });
        }

    };


    /*========================
     * bind events
     * =======================*/
    $(document).on('click', '.close-picker', function () {
        var modal = $('.picker-modal.modal-in');
        modal.trigger('close');
    });


    $.fn.picker = function (options) {
        var args = arguments;
        return this.each(function () {
            if (!this) return;
            var $this = $(this);

            var picker = $this.data("picker");
            if (!picker) {
                var params = $.extend({
                    input: $this,
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
        zeroFixed: function (val) {
            return parseInt(val) < 10 ? '0' + parseInt(val) : '' + val;
        },
        makeArr: function (max, min) {
            var arr = [];
            for (var i = min || 0; i <= max; i++) {
                arr.push(M.zeroFixed(i));
            }
            return arr;
        },
        getDaysByYearAndMonth: function (year, month) {
            var max = new Date(new Date(year, month, 1) - 1).getDate();
            return M.makeArr(max);
        },
        formatDate: function (values, format) {
            for (var i = 0; i < values.length; i++) {
                values[i] = M.zeroFixed(values[i]);
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
        DateStringToArr: function (str) {
            var date = str ? new Date(str) : new Date();
            return $.map([date.getFullYear(), date.getMonth() + 1, date.getDate(), date.getHours(), date.getMinutes()], function (item, index) {
                return M.zeroFixed(item);
            });
        }
    };

    /*默认参数*/
    var defaults = {
        format: 'yyyy-MM-dd hh:mm', //日期字符串格式
        value: [],  //默认值，如：['2015', '12', '29', '19', '15']
        yearLimit: [1950, 2030], //年份范围
        level: 5,  //日期默认可选层级
        onChange: function (params) {
            //console.log('params.cols[2]--->',JSON.stringify(params.cols[2]));

            var days = M.getDaysByYearAndMonth(params.cols[0].value, params.cols[1].value);
            var currentValue = params.cols[2].value;
            if (currentValue > days.length) currentValue = days.length; //日
            params.cols[2].value = currentValue;

            //console.log('params.cols[2].value---->',params.cols[2].value)
            //console.log('typeof params.cols[2].setColTranslate--->',typeof params.cols[2].setColTranslate)
            //params.cols[2].setColTranslate(currentValue);

        },
        formatValue: function (params) {
            return M.formatDate(params.value, params.format || defaults.format);
        }
    };

    /*当前时间*/
    defaults.value = M.DateStringToArr();   //默认为当前时间
    //console.log(defaults.value)

    /*需要显示的列数*/
    defaults.cols = [
        {
            /*年份范围*/
            values: M.makeArr(defaults.yearLimit[1], defaults.yearLimit[0]),
            suffix: '年'
        },
        {
            /*1-12月份*/
            values: M.makeArr(12, 1),
            suffix: '月'
        },
        {
            /*1-31日*/
            values: M.makeArr(31, 1),
            suffix: '日'
        },
        {
            /*24时*/
            values: M.makeArr(24),
            suffix: '时'
        },
        {
            /*60分*/
            values: M.makeArr(59),
            suffix: '分'
        },
        {
            /*60秒*/
            values: M.makeArr(59),
            suffix: '秒'
        }
    ];


    /*plugin*/
    $.fn.datetimePicker = function (options) {
        return this.each(function () {
            if (!this) return;
            var $this = $(this);

            var params = $.extend({}, defaults, options || {});

            if (options && options.value) $this.val(M.formatDate(options.value, params.format));

            var dateStr = $this[0].tagName.toLowerCase() === 'input' ? $this.data('val') || $this.val() : $this.text();  //dateStr = '';
            if (dateStr) params.value = M.DateStringToArr(dateStr);

            //处理dateArr
            params.value = Array.prototype.slice.call(params.value, 0, params.level); //console.log(params.value)

            $this.picker(params);
        });
    };


})(window.jQuery || window.Zepto);