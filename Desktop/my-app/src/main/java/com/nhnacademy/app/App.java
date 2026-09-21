package com.nhnacademy.app;

public class App {

    public static boolean isNullOrEmpty(String str) {

        if(str == null || str.isEmpty()) {
            return true;
        }
        return false;
    }

    public static void main( String[] args ){
        System.out.println( "Hello World!" );

        double num=0;
        for(int i=0; i<100; i++){
            num=Math.random();
        }
        System.out.println(num);

    }

}
